"""
AegisOps – Docker operations via the Python Docker SDK.

Provides async-friendly helpers for restarting containers.
"""

from __future__ import annotations

import asyncio
import logging

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
        logger.info("Docker client connected (server v%s).", _client.version()["Version"])
    return _client


async def restart_container(name: str = TARGET_CONTAINER, timeout: int = 10) -> str:
    """
    Restart a running container by *name*.

    Returns a short status string on success; raises on failure.
    """
    logger.info("Restarting container '%s' (timeout=%ds)…", name, timeout)

    def _restart() -> str:
        client = _get_client()
        try:
            container = client.containers.get(name)
        except NotFound:
            raise RuntimeError(f"Container '{name}' not found on this host.")
        try:
            container.restart(timeout=timeout)
        except APIError as exc:
            raise RuntimeError(f"Docker API error while restarting '{name}': {exc}")
        container.reload()
        return container.status  # e.g. "running"

    status = await asyncio.to_thread(_restart)
    logger.info("Container '%s' status after restart: %s", name, status)
    return status
