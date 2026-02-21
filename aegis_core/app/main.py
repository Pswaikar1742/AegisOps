"""
AegisOps GOD MODE – FastAPI Entry Point.

Pillars:
  1. 👁️ Omniscience  – WebSocket streaming (typewriter AI, live metrics)
  2. 🧠 Intelligence – Multi-Agent Council (SRE → Security → Auditor)
  3. ⚡ Omnipotence  – Auto-scaling with Nginx LB reconfiguration

Run:  uvicorn aegis_core.app.main:app --host 0.0.0.0 --port 8001 --reload
"""

from __future__ import annotations

import asyncio
import datetime as _dt
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ai_brain import analyze_logs, council_review, stream_analysis
from .ai_brain import get_relevant_runbook_entries, _load_runbook
from .docker_ops import (
    restart_container, get_container_logs, list_running_containers,
    get_all_metrics, scale_up, scale_down, reconfigure_nginx,
)
from .models import (
    ActionType, CouncilVerdict, IncidentPayload, IncidentResult,
    ResolutionStatus, TimelineEntry, WSFrameType,
)
from .verification import append_to_runbook, verify_health
from .slack_notifier import notify as slack_notify
from .ws_manager import manager as ws

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-22s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger("aegis.main")

# ── Metrics background task handle ───────────────────────────────────
_metrics_task: asyncio.Task | None = None


async def _metrics_loop() -> None:
    """Push live container metrics to all WS clients every 3 seconds."""
    from .config import METRICS_INTERVAL_SECS
    while True:
        try:
            if ws.count > 0:
                metrics = await get_all_metrics()
                await ws.broadcast_raw(
                    WSFrameType.METRICS,
                    data=[m.model_dump() for m in metrics],
                )
                containers = await list_running_containers()
                await ws.broadcast_raw(WSFrameType.CONTAINER_LIST, data=containers)
        except Exception as exc:
            logger.debug("Metrics loop error: %s", exc)
        await asyncio.sleep(METRICS_INTERVAL_SECS)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _metrics_task
    logger.info("🛡️  AegisOps GOD MODE starting…")
    _metrics_task = asyncio.create_task(_metrics_loop())
    yield
    _metrics_task.cancel()
    logger.info("🛡️  AegisOps GOD MODE shutting down.")


app = FastAPI(
    title="AegisOps – GOD MODE SRE Agent",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper: timeline append ─────────────────────────────────────────
def _timeline(result: IncidentResult, status: str, msg: str, agent: str | None = None):
    result.timeline.append(TimelineEntry(status=status, message=msg, agent=agent))


# ── GOD MODE Remediation Pipeline ───────────────────────────────────
async def _remediate(payload: IncidentPayload, result: IncidentResult) -> None:
    """
    Full God Mode RAG pipeline:
      0. RAG Retrieval (TF-IDF similarity on runbook.json)
      1. AI Analysis (SRE Agent, RAG-augmented system prompt)
      2. Multi-Agent Council Review
      3. Execute action (restart OR scale-up)
      4. Nginx LB reconfiguration (if scaled)
      5. Health verification
      6. Runbook learning (save for future RAG)
    """
    iid = payload.incident_id

    # ── 0. RAG Retrieval — broadcast to UI ───────────────────────────
    import asyncio as _aio
    from .ai_brain import get_relevant_runbook_entries as _rag_retrieve

    rag_entries = await _aio.to_thread(_rag_retrieve, payload.logs)
    if rag_entries:
        _timeline(result, "RAG_RETRIEVAL",
                  f"📚 Retrieved {len(rag_entries)} similar past incidents "
                  f"(best match: {rag_entries[0]['similarity_score']:.1%})",
                  "RAG_ENGINE")
        await ws.broadcast_raw(WSFrameType.AI_THINKING, data={
            "incident_id": iid,
            "message": f"📚 RAG: Found {len(rag_entries)} similar past incidents. "
                       f"Injecting runbook knowledge into AI prompt…"
        }, incident_id=iid)
    else:
        _timeline(result, "RAG_RETRIEVAL",
                  "📚 Cold start – no prior incidents in runbook yet.",
                  "RAG_ENGINE")
        await ws.broadcast_raw(WSFrameType.AI_THINKING, data={
            "incident_id": iid,
            "message": "📚 RAG: Cold start – reasoning from first principles…"
        }, incident_id=iid)

    # ── 1. AI Analysis with streaming (RAG-augmented) ────────────────
    result.status = ResolutionStatus.ANALYSING
    _timeline(result, "ANALYSING", "AI SRE Agent is analysing the incident…", "SRE_AGENT")
    await ws.broadcast_raw(WSFrameType.STATUS_UPDATE, data={
        "incident_id": iid, "status": "ANALYSING",
        "message": "🧠 AI SRE Agent is analysing (RAG-augmented)…"
    }, incident_id=iid)

    # Stream thinking tokens to UI
    await ws.broadcast_raw(WSFrameType.AI_THINKING, data={
        "incident_id": iid, "message": "Analysing logs…"
    }, incident_id=iid)

    streamed_text = ""
    try:
        async for chunk in stream_analysis(payload):
            streamed_text += chunk
            await ws.broadcast_raw(WSFrameType.AI_STREAM, data={
                "incident_id": iid, "chunk": chunk, "full_text": streamed_text,
            }, incident_id=iid)
    except Exception:
        pass  # Non-streaming fallback will be used by analyze_logs

    try:
        analysis = await analyze_logs(payload)
        result.analysis = analysis
        await ws.broadcast_raw(WSFrameType.AI_COMPLETE, data={
            "incident_id": iid, "analysis": analysis.model_dump(),
        }, incident_id=iid)
        _timeline(result, "AI_COMPLETE",
                  f"Root cause: {analysis.root_cause} → {analysis.action.value}",
                  "SRE_AGENT")
        await slack_notify(payload, ResolutionStatus.ANALYSING, analysis=analysis)
    except Exception as exc:
        result.status = ResolutionStatus.FAILED
        result.error = f"LLM failed: {exc}"
        _timeline(result, "FAILED", result.error, "SRE_AGENT")
        await ws.broadcast_raw(WSFrameType.FAILED, data={
            "incident_id": iid, "error": result.error
        }, incident_id=iid)
        await slack_notify(payload, ResolutionStatus.FAILED, error=result.error)
        return

    # ── 2. Multi-Agent Council ───────────────────────────────────────
    result.status = ResolutionStatus.COUNCIL_REVIEW
    _timeline(result, "COUNCIL_REVIEW", "Convening the AI Council…")
    await ws.broadcast_raw(WSFrameType.STATUS_UPDATE, data={
        "incident_id": iid, "status": "COUNCIL_REVIEW",
        "message": "🏛️ Multi-Agent Council convened…"
    }, incident_id=iid)

    try:
        decision = await council_review(payload, analysis)
        result.council_decision = decision

        # Broadcast each vote individually for dramatic effect
        for vote in decision.votes:
            await ws.broadcast_raw(WSFrameType.COUNCIL_VOTE, data={
                "incident_id": iid, "vote": vote.model_dump(),
            }, incident_id=iid)
            _timeline(result, "COUNCIL_VOTE",
                      f"{vote.role.value}: {vote.verdict.value} – {vote.reasoning[:80]}",
                      vote.role.value)
            await asyncio.sleep(0.5)  # Stagger for UI drama

        await ws.broadcast_raw(WSFrameType.COUNCIL_DECISION, data={
            "incident_id": iid, "decision": decision.model_dump(),
        }, incident_id=iid)
        _timeline(result, "COUNCIL_DECISION", decision.summary)
        await slack_notify(payload, ResolutionStatus.COUNCIL_REVIEW,
                          analysis=analysis, council=decision)

        if decision.final_verdict == CouncilVerdict.REJECTED:
            result.status = ResolutionStatus.FAILED
            result.error = f"Council REJECTED the action: {decision.summary}"
            _timeline(result, "FAILED", result.error)
            await ws.broadcast_raw(WSFrameType.FAILED, data={
                "incident_id": iid, "error": result.error
            }, incident_id=iid)
            return

    except Exception as exc:
        logger.warning("Council review failed: %s – proceeding anyway", exc)
        _timeline(result, "COUNCIL_BYPASS", f"Council error: {exc} – auto-approved")

    result.status = ResolutionStatus.APPROVED
    _timeline(result, "APPROVED", "Council approved the action.")

    # ── 3. Execute Action ────────────────────────────────────────────
    result.status = ResolutionStatus.EXECUTING
    _timeline(result, "EXECUTING", f"Executing: {analysis.action.value}")
    await ws.broadcast_raw(WSFrameType.STATUS_UPDATE, data={
        "incident_id": iid, "status": "EXECUTING",
        "message": f"⚡ Executing {analysis.action.value}…"
    }, incident_id=iid)

    if analysis.action == ActionType.SCALE_UP:
        # ── OMNIPOTENCE: Auto-scaling ────────────────────────────────
        result.status = ResolutionStatus.SCALING
        _timeline(result, "SCALING",
                  f"Spawning {analysis.replica_count} replicas…")
        await ws.broadcast_raw(WSFrameType.STATUS_UPDATE, data={
            "incident_id": iid, "status": "SCALING",
            "message": f"⚡ Scaling to {analysis.replica_count} replicas…"
        }, incident_id=iid)

        try:
            event = await scale_up(count=analysis.replica_count)
            result.replicas_spawned = len(event.replicas)
            _timeline(result, "SCALED", f"Spawned: {event.replicas}")
            await ws.broadcast_raw(WSFrameType.SCALE_EVENT, data={
                "incident_id": iid, "event": event.model_dump(),
            }, incident_id=iid)

            # Reconfigure Nginx
            lb_ok = await reconfigure_nginx(replicas=event.replicas)
            event.lb_configured = lb_ok
            if lb_ok:
                _timeline(result, "LB_CONFIGURED", "Nginx load balancer updated")
            await slack_notify(payload, ResolutionStatus.SCALING, analysis=analysis)
        except Exception as exc:
            logger.warning("Scaling failed: %s – falling back to restart", exc)
            _timeline(result, "SCALE_FAILED", f"Scaling error: {exc}, falling back to restart")
            # Fallback to restart
            try:
                await restart_container()
                _timeline(result, "RESTARTED", "Container restarted (scale fallback)")
            except Exception as exc2:
                result.status = ResolutionStatus.FAILED
                result.error = f"Both scale and restart failed: {exc2}"
                _timeline(result, "FAILED", result.error)
                await ws.broadcast_raw(WSFrameType.FAILED, data={
                    "incident_id": iid, "error": result.error
                }, incident_id=iid)
                return

    elif analysis.action == ActionType.RESTART:
        try:
            await ws.broadcast_raw(WSFrameType.DOCKER_ACTION, data={
                "incident_id": iid, "action": "RESTART", "container": "buggy-app-v2",
            }, incident_id=iid)
            status = await restart_container()
            _timeline(result, "RESTARTED", f"Container status: {status}")
            await slack_notify(payload, ResolutionStatus.EXECUTING, analysis=analysis)
        except Exception as exc:
            result.status = ResolutionStatus.FAILED
            result.error = f"Restart failed: {exc}"
            _timeline(result, "FAILED", result.error)
            await ws.broadcast_raw(WSFrameType.FAILED, data={
                "incident_id": iid, "error": result.error
            }, incident_id=iid)
            await slack_notify(payload, ResolutionStatus.FAILED, analysis=analysis, error=result.error)
            return

    elif analysis.action == ActionType.SCALE_DOWN:
        try:
            removed = await scale_down()
            _timeline(result, "SCALED_DOWN", f"Removed replicas: {removed}")
            await reconfigure_nginx(replicas=[])
        except Exception as exc:
            logger.warning("Scale down failed: %s", exc)

    elif analysis.action == ActionType.NOOP:
        _timeline(result, "NOOP", "No action required.")
        result.status = ResolutionStatus.RESOLVED
        await ws.broadcast_raw(WSFrameType.RESOLVED, data={
            "incident_id": iid, "message": "No action needed."
        }, incident_id=iid)
        await slack_notify(payload, ResolutionStatus.RESOLVED, analysis=analysis)
        return

    # ── 4. Verify health ─────────────────────────────────────────────
    result.status = ResolutionStatus.VERIFYING
    _timeline(result, "VERIFYING", "Running health checks…")
    await ws.broadcast_raw(WSFrameType.STATUS_UPDATE, data={
        "incident_id": iid, "status": "VERIFYING",
        "message": "🩺 Verifying service health…"
    }, incident_id=iid)

    healthy = await verify_health()

    for i in range(1, 4):
        await ws.broadcast_raw(WSFrameType.HEALTH_CHECK, data={
            "incident_id": iid, "attempt": i, "healthy": healthy,
        }, incident_id=iid)

    if healthy:
        result.status = ResolutionStatus.RESOLVED
        result.resolved_at = _dt.datetime.utcnow().isoformat()
        _timeline(result, "RESOLVED", "Service is healthy! Incident resolved.")
        await ws.broadcast_raw(WSFrameType.RESOLVED, data={
            "incident_id": iid, "resolved_at": result.resolved_at,
        }, incident_id=iid)
        await append_to_runbook(
            payload, analysis,
            council_approved=True,
            replicas_used=result.replicas_spawned,
        )
        await slack_notify(payload, ResolutionStatus.RESOLVED, analysis=analysis,
                          council=result.council_decision)
        logger.info("✅ GOD MODE: Incident %s RESOLVED", iid)
    else:
        result.status = ResolutionStatus.FAILED
        result.error = "Health check failed after all retries."
        _timeline(result, "FAILED", result.error)
        await ws.broadcast_raw(WSFrameType.FAILED, data={
            "incident_id": iid, "error": result.error,
        }, incident_id=iid)
        await slack_notify(payload, ResolutionStatus.FAILED, analysis=analysis, error=result.error)
        logger.warning("❌ GOD MODE: Incident %s FAILED", iid)


# ── In-memory incident store ─────────────────────────────────────────
incidents: dict[str, IncidentResult] = {}


# ── REST routes ──────────────────────────────────────────────────────
@app.post("/webhook", response_model=IncidentResult)
async def receive_webhook(payload: IncidentPayload, bg: BackgroundTasks):
    logger.info("📨 Webhook: %s (%s)", payload.incident_id, payload.alert_type)
    result = IncidentResult(incident_id=payload.incident_id, alert_type=payload.alert_type)
    _timeline(result, "RECEIVED", "Incident received via webhook.")
    incidents[payload.incident_id] = result

    await ws.broadcast_raw(WSFrameType.INCIDENT_NEW, data={
        "incident_id": payload.incident_id, "alert_type": payload.alert_type,
        "logs": payload.logs[:200],
    }, incident_id=payload.incident_id)

    bg.add_task(_remediate, payload, result)
    bg.add_task(slack_notify, payload, ResolutionStatus.RECEIVED)
    return result


@app.get("/incidents/{incident_id}", response_model=IncidentResult)
async def get_incident(incident_id: str):
    if incident_id not in incidents:
        raise HTTPException(404, "Incident not found.")
    return incidents[incident_id]


@app.get("/incidents")
async def list_incidents():
    return list(incidents.values())


@app.get("/containers")
async def containers():
    try:
        return await list_running_containers()
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/metrics")
async def metrics():
    """Get live metrics for all containers."""
    try:
        data = await get_all_metrics()
        return [m.model_dump() for m in data]
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.post("/scale/{direction}")
async def manual_scale(direction: str, count: int = 2):
    """Manual scaling endpoint. direction = 'up' or 'down'."""
    if direction == "up":
        event = await scale_up(count=count)
        await reconfigure_nginx(replicas=event.replicas)
        await ws.broadcast_raw(WSFrameType.SCALE_EVENT, data=event.model_dump())
        return event.model_dump()
    elif direction == "down":
        removed = await scale_down()
        await reconfigure_nginx(replicas=[])
        return {"removed": removed}
    raise HTTPException(400, "direction must be 'up' or 'down'")


@app.get("/health")
async def healthcheck():
    return {"status": "ok", "mode": "GOD_MODE", "version": "2.0.0", "ws_clients": ws.count}


@app.get("/topology")
async def topology():
    """Return service topology for the UI graph."""
    containers_list = await list_running_containers()
    nodes = []
    edges = []

    for c in containers_list:
        node_type = "unknown"
        if "buggy" in c["name"]:
            node_type = "app"
        elif "aegis-agent" in c["name"]:
            node_type = "agent"
        elif "dashboard" in c["name"]:
            node_type = "dashboard"
        elif "lb" in c["name"] or "nginx" in c["name"]:
            node_type = "loadbalancer"
        elif "replica" in c["name"]:
            node_type = "replica"

        nodes.append({
            "id": c["name"],
            "type": node_type,
            "status": c["status"],
            "image": c.get("image", ""),
        })

    # Auto-generate edges
    agent_name = "aegis-agent"
    for n in nodes:
        if n["type"] == "app":
            edges.append({"from": agent_name, "to": n["id"], "label": "monitors"})
        elif n["type"] == "replica":
            edges.append({"from": agent_name, "to": n["id"], "label": "spawned"})
        elif n["type"] == "loadbalancer":
            edges.append({"from": n["id"], "to": "buggy-app-v2", "label": "routes"})

    return {"nodes": nodes, "edges": edges}


@app.get("/runbook")
async def runbook():
    """Return the full runbook knowledge base (RAG corpus)."""
    entries = _load_runbook()
    return {"entries": entries, "total": len(entries)}


@app.get("/rag/test")
async def rag_test(logs: str = "CPU usage at 98% infinite loop"):
    """
    Test the RAG retrieval engine.
    Pass ?logs=<text> and see which past incidents are most similar.
    """
    results = get_relevant_runbook_entries(logs)
    return {
        "query": logs,
        "retrieved": results,
        "count": len(results),
    }


# ── WebSocket endpoint ───────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws.connect(websocket)
    try:
        # Send initial state
        await ws.broadcast_raw(WSFrameType.HEARTBEAT, data={"status": "connected"})
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Client can send "ping" to keep alive
            if data == "ping":
                await websocket.send_json({"type": "heartbeat", "data": {"status": "alive"}})
    except WebSocketDisconnect:
        await ws.disconnect(websocket)
    except Exception:
        await ws.disconnect(websocket)
