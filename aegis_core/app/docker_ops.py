"""
AegisOps – Docker operations via the Python Docker SDK.

Provides async-friendly helpers for:
  • Listing running containers
  • Restarting a target container with pre-flight checks
  • Capturing recent container logs for diagnostics
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import docker
from docker.errors import NotFound, APIError

from .config import TARGET_CONTAINER

logger = logging.getLogger("aegis.docker_ops")

# ── Low-level Docker client (thread-safe for read ops) ───────────────
_client: docker.DockerClient | None = None


def _get_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
        ver = _client.version().get("Version", "unknown")
        logger.info("Docker client connected (server v%s).", ver)
    return _client


# ── Public helpers ───────────────────────────────────────────────────
async def restart_container(
    name: str = TARGET_CONTAINER,
    timeout: int = 10,
) -> str:
    """
    Restart a container by *name* with pre-flight validation.

    Returns the container status string after restart (e.g. "running").
    Raises RuntimeError with a clear message on any failure.
    """
    logger.info("🔄 Restarting container '%s' (timeout=%ds)…", name, timeout)

    def _restart() -> str:
        client = _get_client()

        # 1. Locate the container
        try:
            container = client.containers.get(name)
        except NotFound:
            available = [c.name for c in client.containers.list(all=True)]
            raise RuntimeError(
                f"Container '{name}' not found. "
                f"Available containers: {available}"
            )

        pre_status = container.status
        logger.info("Container '%s' pre-restart status: %s", name, pre_status)

        # 2. Restart
        try:
            container.restart(timeout=timeout)
        except APIError as exc:
            raise RuntimeError(
                f"Docker API error while restarting '{name}': {exc}"
            )

        # 3. Verify post-restart state
        container.reload()
        post_status = container.status
        logger.info(
            "Container '%s' post-restart status: %s → %s",
            name, pre_status, post_status,
        )
        return post_status

    status = await asyncio.to_thread(_restart)
    return status


async def get_container_logs(
    name: str = TARGET_CONTAINER,
    tail: int = 50,
) -> str:
    """Fetch the last *tail* lines of a container's logs (for diagnostics)."""

    def _logs() -> str:
        client = _get_client()
        try:
            container = client.containers.get(name)
        except NotFound:
            return f"[container '{name}' not found]"
        raw = container.logs(tail=tail, timestamps=True)
        return raw.decode("utf-8", errors="replace")

    return await asyncio.to_thread(_logs)


async def list_running_containers() -> list[dict]:
    """Return a lightweight list of running containers (name + status)."""

    def _list() -> list[dict]:
        client = _get_client()
        return [
            {"name": c.name, "status": c.status, "image": c.image.tags}
            for c in client.containers.list()
        ]

    return await asyncio.to_thread(_list)
