"""
AegisOps GOD MODE – WebSocket connection manager.

Manages persistent connections for real-time UI streaming.
Broadcasts frames to all connected cockpit clients.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

from .models import WSFrame, WSFrameType

logger = logging.getLogger("aegis.ws")


class ConnectionManager:
    """
    Thread-safe WebSocket connection manager.
    All connected React cockpit clients receive real-time frames.
    """

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        logger.info("🔌 WS client connected (%d total)", len(self._connections))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)
        logger.info("🔌 WS client disconnected (%d remaining)", len(self._connections))

    async def broadcast(self, frame: WSFrame) -> None:
        """Send a frame to ALL connected clients."""
        async with self._lock:
            dead: list[WebSocket] = []
            for ws in self._connections:
                try:
                    await ws.send_json(frame.model_dump())
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self._connections.remove(ws)

    async def broadcast_raw(self, frame_type: WSFrameType, data: Any = None,
                            incident_id: str | None = None) -> None:
        """Convenience: build and broadcast a WSFrame."""
        frame = WSFrame(type=frame_type, data=data, incident_id=incident_id)
        await self.broadcast(frame)

    @property
    def count(self) -> int:
        return len(self._connections)


# Singleton
manager = ConnectionManager()
