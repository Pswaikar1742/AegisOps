"""
AegisOps GOD MODE – Docker operations with auto-scaling & metrics.

Features:
  • Restart containers
  • Dynamic replica scaling (spawn/destroy containers)
  • Live container metrics (CPU, memory, network)
  • Nginx upstream reconfiguration
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

import docker
from docker.errors import NotFound, APIError

from .config import TARGET_CONTAINER, MAX_REPLICAS, NGINX_CONTAINER
from .models import ContainerMetrics, ScaleEvent

logger = logging.getLogger("aegis.docker_ops")

_client: docker.DockerClient | None = None


def _get_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
        ver = _client.version().get("Version", "unknown")
        logger.info("Docker client connected (server v%s).", ver)
    return _client


# ── Restart ──────────────────────────────────────────────────────────
async def restart_container(name: str = TARGET_CONTAINER, timeout: int = 10) -> str:
    logger.info("🔄 Restarting container '%s' (timeout=%ds)…", name, timeout)

    def _restart() -> str:
        client = _get_client()
        try:
            container = client.containers.get(name)
        except NotFound:
            available = [c.name for c in client.containers.list(all=True)]
            raise RuntimeError(f"Container '{name}' not found. Available: {available}")
        pre = container.status
        try:
            container.restart(timeout=timeout)
        except APIError as exc:
            raise RuntimeError(f"Docker API error restarting '{name}': {exc}")
        container.reload()
        logger.info("Container '%s': %s → %s", name, pre, container.status)
        return container.status

    return await asyncio.to_thread(_restart)


# ── Container logs ───────────────────────────────────────────────────
async def get_container_logs(name: str = TARGET_CONTAINER, tail: int = 50) -> str:
    def _logs() -> str:
        client = _get_client()
        try:
            container = client.containers.get(name)
        except NotFound:
            return f"[container '{name}' not found]"
        raw = container.logs(tail=tail, timestamps=True)
        return raw.decode("utf-8", errors="replace")

    return await asyncio.to_thread(_logs)


# ── List running containers ──────────────────────────────────────────
async def list_running_containers() -> list[dict]:
    def _list() -> list[dict]:
        client = _get_client()
        return [
            {
                "name": c.name,
                "status": c.status,
                "image": c.image.tags[0] if c.image.tags else "unknown",
                "id": c.short_id,
            }
            for c in client.containers.list()
        ]
    return await asyncio.to_thread(_list)


# ── Live metrics for a container ─────────────────────────────────────
async def get_container_metrics(name: str) -> Optional[ContainerMetrics]:
    """Get CPU, memory, network stats for a single container."""
    def _metrics() -> Optional[ContainerMetrics]:
        client = _get_client()
        try:
            container = client.containers.get(name)
        except NotFound:
            return None

        if container.status != "running":
            return ContainerMetrics(name=name, status=container.status)

        try:
            stats = container.stats(stream=False)
        except Exception:
            return ContainerMetrics(name=name, status=container.status)

        # CPU calculation
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = (
            stats["cpu_stats"]["system_cpu_usage"]
            - stats["precpu_stats"]["system_cpu_usage"]
        )
        num_cpus = stats["cpu_stats"].get("online_cpus", 1) or 1
        cpu_pct = (cpu_delta / system_delta * num_cpus * 100.0) if system_delta > 0 else 0.0

        # Memory
        mem_usage = stats["memory_stats"].get("usage", 0)
        mem_limit = stats["memory_stats"].get("limit", 1)
        mem_mb = mem_usage / (1024 * 1024)
        mem_limit_mb = mem_limit / (1024 * 1024)
        mem_pct = (mem_usage / mem_limit * 100.0) if mem_limit > 0 else 0.0

        # Network
        networks = stats.get("networks", {})
        rx = sum(v.get("rx_bytes", 0) for v in networks.values())
        tx = sum(v.get("tx_bytes", 0) for v in networks.values())

        # Uptime
        import dateutil.parser
        started = container.attrs.get("State", {}).get("StartedAt", "")
        try:
            start_time = dateutil.parser.isoparse(started)
            from datetime import datetime, timezone
            uptime = (datetime.now(timezone.utc) - start_time).total_seconds()
        except Exception:
            uptime = 0.0

        image = container.image.tags[0] if container.image.tags else "unknown"

        return ContainerMetrics(
            name=name,
            cpu_percent=round(cpu_pct, 2),
            memory_mb=round(mem_mb, 1),
            memory_limit_mb=round(mem_limit_mb, 1),
            memory_percent=round(mem_pct, 2),
            net_rx_bytes=rx,
            net_tx_bytes=tx,
            status=container.status,
            uptime_seconds=round(uptime, 0),
            image=image,
        )

    return await asyncio.to_thread(_metrics)


async def get_all_metrics() -> list[ContainerMetrics]:
    """Get metrics for ALL running containers."""
    containers = await list_running_containers()
    tasks = [get_container_metrics(c["name"]) for c in containers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, ContainerMetrics)]


# ── Auto-Scaling: spawn replicas ─────────────────────────────────────
async def scale_up(
    base_name: str = TARGET_CONTAINER,
    count: int = 2,
    network: str = "aegis-network",
) -> ScaleEvent:
    """
    Clone the target container into N replicas.
    Each replica gets a unique name: buggy-app-replica-1, buggy-app-replica-2, ...
    """
    count = min(count, MAX_REPLICAS)
    logger.info("⚡ Scaling UP: spawning %d replicas of '%s'", count, base_name)

    def _scale() -> ScaleEvent:
        client = _get_client()
        event = ScaleEvent(container_base=base_name, replica_count=count)

        try:
            source = client.containers.get(base_name)
            image = source.image.tags[0] if source.image.tags else source.image.id
        except NotFound:
            raise RuntimeError(f"Source container '{base_name}' not found for scaling")

        for i in range(1, count + 1):
            replica_name = f"{base_name}-replica-{i}"

            # Remove stale replica if exists
            try:
                old = client.containers.get(replica_name)
                old.remove(force=True)
            except NotFound:
                pass

            try:
                replica = client.containers.run(
                    image,
                    name=replica_name,
                    detach=True,
                    network=network,
                    restart_policy={"Name": "unless-stopped"},
                    environment=source.attrs.get("Config", {}).get("Env", []),
                )
                event.replicas.append(replica_name)
                logger.info("  ✅ Spawned replica: %s", replica_name)
            except Exception as exc:
                logger.error("  ❌ Failed to spawn %s: %s", replica_name, exc)

        return event

    event = await asyncio.to_thread(_scale)
    return event


async def scale_down(base_name: str = TARGET_CONTAINER) -> list[str]:
    """Remove all replicas of the target container."""
    logger.info("📉 Scaling DOWN: removing replicas of '%s'", base_name)

    def _scale_down() -> list[str]:
        client = _get_client()
        removed = []
        for c in client.containers.list(all=True):
            if c.name.startswith(f"{base_name}-replica-"):
                c.remove(force=True)
                removed.append(c.name)
                logger.info("  🗑️ Removed: %s", c.name)
        return removed

    return await asyncio.to_thread(_scale_down)


# ── Nginx upstream reconfiguration ───────────────────────────────────
async def reconfigure_nginx(
    base_name: str = TARGET_CONTAINER,
    replicas: list[str] | None = None,
) -> bool:
    """
    Write new upstream config into the Nginx container and reload.
    Returns True if successful.
    """
    logger.info("🔧 Reconfiguring Nginx load balancer…")

    def _reconfigure() -> bool:
        client = _get_client()
        try:
            nginx = client.containers.get(NGINX_CONTAINER)
        except NotFound:
            logger.warning("Nginx container '%s' not found – skipping LB config", NGINX_CONTAINER)
            return False

        # Build upstream list: original + replicas
        servers = [f"    server {base_name}:8000;"]
        if replicas:
            for r in replicas:
                servers.append(f"    server {r}:8000;")

        upstream_conf = (
            "upstream buggy_app {\n"
            + "\n".join(servers)
            + "\n}\n"
        )

        # Write config via exec
        import io
        import tarfile
        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode="w") as tar:
            data = upstream_conf.encode()
            info = tarfile.TarInfo(name="upstream.conf")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
        tar_stream.seek(0)

        nginx.put_archive("/etc/nginx/conf.d/", tar_stream)
        nginx.exec_run("nginx -s reload")
        logger.info("✅ Nginx reloaded with %d upstream servers", len(servers))
        return True

    return await asyncio.to_thread(_reconfigure)
