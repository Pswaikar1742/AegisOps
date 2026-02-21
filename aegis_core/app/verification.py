"""
AegisOps – Post-action verification loop & runbook learning.

1. Waits VERIFY_DELAY_SECS seconds after a restart.
2. Pings the container health endpoint (retries up to VERIFY_RETRIES times).
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
    VERIFY_RETRIES,
)
from .models import AIAnalysis, IncidentPayload, RunbookEntry

logger = logging.getLogger("aegis.verification")


# ── Health check with retries ────────────────────────────────────────
async def verify_health(
    url: str = HEALTH_URL,
    retries: int = VERIFY_RETRIES,
    delay: int = VERIFY_DELAY_SECS,
) -> bool:
    """
    Wait *delay* seconds, then ping the target service.

    Retries up to *retries* times with *delay*-second gaps.
    Returns True on the first 200 OK; False if all attempts fail.
    """
    for attempt in range(1, retries + 1):
        logger.info(
            "⏳ Health check attempt %d/%d – waiting %ds…",
            attempt, retries, delay,
        )
        await asyncio.sleep(delay)

        try:
            async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT_SECS) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    logger.info(
                        "💚 Health check PASSED on attempt %d (%s → 200)",
                        attempt, url,
                    )
                    return True
                logger.warning(
                    "Health check attempt %d → HTTP %d (expected 200)",
                    attempt, resp.status_code,
                )
        except httpx.RequestError as exc:
            logger.warning(
                "Health check attempt %d failed: %s", attempt, exc,
            )

    logger.error("❌ All %d health-check attempts failed.", retries)
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
            try:
                data = json.loads(path.read_text())
            except json.JSONDecodeError:
                data = []
        else:
            data = []

        # Normalise: bare {} from skeleton → empty list
        if isinstance(data, dict):
            data = []

        data.append(entry.model_dump())
        path.write_text(json.dumps(data, indent=2) + "\n")
        logger.info("📒 Runbook updated – now contains %d entries.", len(data))

    await asyncio.to_thread(_write)
