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

from .ai_brain import analyze_logs
from .docker_ops import restart_container, get_container_logs, list_running_containers
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
    version="0.3.0",
    lifespan=lifespan,
)


# ── Background remediation pipeline ─────────────────────────────────
async def _remediate(payload: IncidentPayload, result: IncidentResult) -> None:
    """
    Full async pipeline:  analyse → act → verify → learn

    Runs as a BackgroundTask so the webhook responds instantly.

    Error policy
    ────────────
    • LLM failure   → mark FAILED, do NOT touch Docker.
    • Docker failure → mark FAILED, capture container logs for debug.
    • Health failure → mark FAILED after all retries are exhausted.
    """

    # ── 1. AI Reasoning (FastRouter → Ollama fallback) ───────────────
    try:
        analysis = await analyze_logs(payload)
        result.analysis = analysis
        result.status = ResolutionStatus.EXECUTING
    except Exception as exc:  # noqa: BLE001
        result.status = ResolutionStatus.FAILED
        result.error = f"LLM call failed – not retrying: {exc}"
        logger.error(
            "🚫 LLM error for incident %s: %s", payload.incident_id, exc,
        )
        return

    # ── 2. Execute Action ────────────────────────────────────────────
    if analysis.action != ActionType.RESTART:
        logger.info(
            "Action '%s' is not auto-executable – marking resolved.",
            analysis.action.value,
        )
        result.status = ResolutionStatus.RESOLVED
        return

    try:
        logger.info("🔄 Restarting container for incident %s…", payload.incident_id)
        container_status = await restart_container()
        logger.info("Container post-restart: %s", container_status)
    except Exception as exc:  # noqa: BLE001
        result.status = ResolutionStatus.FAILED
        result.error = f"Docker restart failed: {exc}"
        logger.error(
            "🐳 Docker error for incident %s: %s", payload.incident_id, exc,
        )
        # Grab container logs for post-mortem
        try:
            tail = await get_container_logs()
            logger.info("Container tail-logs:\n%s", tail)
        except Exception:  # noqa: BLE001
            pass
        return

    # ── 3. Verify (health-check with retries) ───────────────────────
    healthy = await verify_health()

    if healthy:
        result.status = ResolutionStatus.RESOLVED
        # ── 4. Learn – append to runbook.json ────────────────────────
        await append_to_runbook(payload, analysis)
        logger.info("✅ Incident %s RESOLVED.", payload.incident_id)
    else:
        result.status = ResolutionStatus.FAILED
        result.error = "Health check failed after restart (all retries exhausted)."
        logger.warning("❌ Incident %s FAILED verification.", payload.incident_id)


# ── In-memory incident tracker (good enough for hackathon) ───────────
incidents: dict[str, IncidentResult] = {}


# ── Routes ───────────────────────────────────────────────────────────
@app.post("/webhook", response_model=IncidentResult, status_code=200)
async def receive_webhook(
    payload: IncidentPayload,
    background_tasks: BackgroundTasks,
):
    """
    Receive an alert from the OpenTelemetry Collector.

    Returns **200 OK** immediately; the heavy remediation pipeline
    (AI reasoning → Docker restart → health check → runbook) runs
    as a FastAPI BackgroundTask.
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


@app.get("/incidents")
async def list_incidents():
    """List every tracked incident (useful for the dashboard)."""
    return list(incidents.values())


@app.get("/containers")
async def containers():
    """Debug endpoint – list all running Docker containers."""
    try:
        return await list_running_containers()
    except Exception as exc:
        return JSONResponse(
            {"error": str(exc)},
            status_code=500,
        )


@app.get("/health")
async def healthcheck():
    return JSONResponse({"status": "ok"})
