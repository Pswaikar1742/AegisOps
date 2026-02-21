"""
AegisOps – Post-action verification loop & runbook learning.

1. Waits VERIFY_DELAY_SECS seconds.
2. Pings the container health endpoint.
3. If healthy → writes a learning entry to runbook.json.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

import httpx

from .config import (
    HEALTH_TIMEOUT_SECS,
    HEALTH_URL,
    RUNBOOK_PATH,
    VERIFY_DELAY_SECS,
)
from .models import AIAnalysis, IncidentPayload, RunbookEntry

logger = logging.getLogger("aegis.verification")


# ── Health check ─────────────────────────────────────────────────────
async def verify_health(url: str = HEALTH_URL) -> bool:
    """
    Wait, then ping the target service.  Returns True when status 200.
    """
    logger.info("Waiting %ds before health check…", VERIFY_DELAY_SECS)
    await asyncio.sleep(VERIFY_DELAY_SECS)

    try:
        async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT_SECS) as client:
            resp = await client.get(url)
            healthy = resp.status_code == 200
            logger.info("Health check %s → %s", url, resp.status_code)
            return healthy
    except httpx.RequestError as exc:
        logger.warning("Health check failed: %s", exc)
        return False


# ── Runbook learning ─────────────────────────────────────────────────
async def append_to_runbook(
    payload: IncidentPayload,
    analysis: AIAnalysis,
    path: Path = RUNBOOK_PATH,
) -> None:
    """Append a resolved incident to the local runbook JSON file."""

    entry = RunbookEntry(
        incident_id=payload.incident_id,
        alert_type=payload.alert_type,
        root_cause=analysis.root_cause,
        action=analysis.action.value,
        justification=analysis.justification,
    )

    def _write() -> None:
        # Read existing entries (or start fresh)
        if path.exists() and path.stat().st_size > 2:
            data = json.loads(path.read_text())
        else:
            data = []

        # Normalise: bare {} from skeleton → empty list
        if isinstance(data, dict):
            data = []

        data.append(entry.model_dump())
        path.write_text(json.dumps(data, indent=2) + "\n")
        logger.info("Runbook updated – now contains %d entries.", len(data))

    await asyncio.to_thread(_write)
