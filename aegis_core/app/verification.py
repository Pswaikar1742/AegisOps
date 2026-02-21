"""
AegisOps GOD MODE – Post-action verification loop & runbook learning.

The runbook (runbook.json) is the RAG knowledge base:
  • Every resolved incident saves: logs, root_cause, action, justification
  • On the next incident, TF-IDF retrieves the most similar past entries
  • Those entries get injected into the LLM system prompt
  • The LLM produces better diagnoses over time → recursive self-improvement
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

import httpx

from .config import (
    HEALTH_TIMEOUT_SECS, HEALTH_URL, RUNBOOK_PATH,
    VERIFY_DELAY_SECS, VERIFY_RETRIES,
)
from .models import AIAnalysis, IncidentPayload, RunbookEntry

logger = logging.getLogger("aegis.verification")


async def verify_health(
    url: str = HEALTH_URL,
    retries: int = VERIFY_RETRIES,
    delay: int = VERIFY_DELAY_SECS,
) -> bool:
    for attempt in range(1, retries + 1):
        logger.info("⏳ Health check %d/%d – waiting %ds…", attempt, retries, delay)
        await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT_SECS) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    logger.info("💚 Health PASSED on attempt %d", attempt)
                    return True
                logger.warning("Health attempt %d → HTTP %d", attempt, resp.status_code)
        except httpx.RequestError as exc:
            logger.warning("Health attempt %d failed: %s", attempt, exc)
    logger.error("❌ All %d health-check attempts failed.", retries)
    return False


async def append_to_runbook(
    payload: IncidentPayload,
    analysis: AIAnalysis,
    council_approved: bool = True,
    replicas_used: int = 0,
    path: Path = RUNBOOK_PATH,
) -> None:
    """
    Save resolved incident to runbook.json for RAG retrieval.

    CRITICAL: We save the raw logs, container_name, severity alongside
    root_cause/action/justification so the TF-IDF vectorizer can build
    rich similarity scores on the NEXT incident. This is the "learning"
    side of the recursive loop.
    """
    entry = RunbookEntry(
        incident_id=payload.incident_id,
        alert_type=payload.alert_type,
        logs=payload.logs,                                   # ← FULL logs for RAG
        container_name=payload.container_name or "unknown",  # ← container context
        severity=payload.severity or "UNKNOWN",              # ← severity context
        root_cause=analysis.root_cause,
        action=analysis.action.value,
        justification=analysis.justification,
        confidence=analysis.confidence,                      # ← model confidence
        council_approved=council_approved,
        replicas_used=replicas_used,
    )

    def _write() -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 2:
            try:
                data = json.loads(path.read_text())
            except json.JSONDecodeError:
                data = []
        else:
            data = []
        if isinstance(data, dict):
            data = []
        data.append(entry.model_dump())
        path.write_text(json.dumps(data, indent=2) + "\n")
        logger.info(
            "📒 Runbook updated – %d entries total. RAG corpus growing. "
            "(sabka sath, sabka vikas 🚀)",
            len(data),
        )

    await asyncio.to_thread(_write)
