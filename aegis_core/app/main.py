"""
AegisOps – FastAPI entry-point for the Autonomous SRE Agent.

Run with:
    uvicorn aegis_core.app.main:app --host 0.0.0.0 --port 8080 --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from .ai_brain import analyse_incident
from .docker_ops import restart_container
from .models import (
    ActionType,
    IncidentPayload,
    IncidentResult,
    ResolutionStatus,
)
from .verification import append_to_runbook, verify_health

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-22s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger("aegis.main")


# ── Lifespan (startup / shutdown hooks) ──────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("🛡️  AegisOps Agent Core starting…")
    yield
    logger.info("🛡️  AegisOps Agent Core shutting down.")


app = FastAPI(
    title="AegisOps – Autonomous SRE Agent",
    version="0.1.0",
    lifespan=lifespan,
)


# ── Background remediation pipeline ─────────────────────────────────
async def _remediate(payload: IncidentPayload, result: IncidentResult) -> None:
    """
    Full async pipeline:
      analyse → act → verify → learn
    Runs as a background task so the webhook responds instantly.
    """
    try:
        # 1️⃣  AI reasoning
        analysis = await analyse_incident(payload)
        result.analysis = analysis
        result.status = ResolutionStatus.EXECUTING

        # 2️⃣  Execute action
        if analysis.action == ActionType.RESTART:
            await restart_container()
        else:
            logger.info(
                "Action '%s' is not auto-executable – skipping.",
                analysis.action.value,
            )
            result.status = ResolutionStatus.RESOLVED
            return

        # 3️⃣  Verify
        healthy = await verify_health()

        if healthy:
            result.status = ResolutionStatus.RESOLVED
            # 4️⃣  Learn
            await append_to_runbook(payload, analysis)
            logger.info("✅ Incident %s RESOLVED.", payload.incident_id)
        else:
            result.status = ResolutionStatus.FAILED
            result.error = "Health check failed after restart."
            logger.warning("❌ Incident %s FAILED verification.", payload.incident_id)

    except Exception as exc:  # noqa: BLE001
        result.status = ResolutionStatus.FAILED
        result.error = str(exc)
        logger.exception("Pipeline error for incident %s", payload.incident_id)


# ── In-memory incident tracker (good enough for hackathon) ───────────
incidents: dict[str, IncidentResult] = {}


# ── Routes ───────────────────────────────────────────────────────────
@app.post("/webhook", response_model=IncidentResult, status_code=202)
async def receive_webhook(
    payload: IncidentPayload,
    background_tasks: BackgroundTasks,
):
    """
    Receive an alert from the OpenTelemetry Collector.

    Returns 202 immediately; remediation runs in the background.
    """
    logger.info(
        "📨 Webhook received – incident=%s type=%s",
        payload.incident_id,
        payload.alert_type,
    )

    result = IncidentResult(
        incident_id=payload.incident_id,
        alert_type=payload.alert_type,
    )
    incidents[payload.incident_id] = result

    background_tasks.add_task(_remediate, payload, result)

    return result


@app.get("/incidents/{incident_id}", response_model=IncidentResult)
async def get_incident(incident_id: str):
    """Poll the current status of a tracked incident."""
    if incident_id not in incidents:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incidents[incident_id]


@app.get("/health")
async def healthcheck():
    return JSONResponse({"status": "ok"})
