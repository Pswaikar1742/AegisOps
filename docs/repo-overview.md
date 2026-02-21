# Repository Overview — AegisOps

This document summarizes the repository layout, primary components (frontend + backend), data flows, WebSocket frames, REST endpoints, and a step-by-step QA/test checklist to validate functionality one step at a time.

**Repository root**
- `docker-compose.yml` — local compose definitions for services.
- `README.md` — project readme.
- `docs/` — project docs (this file is `repo-overview.md`).

**Top-level services (compose)**
- `aegis_cockpit` — React SPA (Vite + Tailwind) served by nginx (port 3000) — user cockpit UI.
- `aegis_agent` / `aegis_core` — FastAPI agent (port 8001) — core remediation pipeline, LLM orchestration.
- `aegis_dashboard` — optional dashboard service.
- `aegis_lb` — nginx load balancer.
- `buggy-app-v2` — target app used by simulations.

---

## Frontend (Cockpit)
Key files:
- `aegis_cockpit/src/main.jsx` — app bootstrap
- `aegis_cockpit/src/App.jsx` — routes
- `aegis_cockpit/src/hooks/useWebSocket.js` — WebSocket client (connects to `/ws`)
- `aegis_cockpit/src/hooks/useApi.js` — REST helpers (`/incidents`, `/containers`, `/metrics`, `/topology`, `/health`, `/scale`)

Main components:
- `aegis_cockpit/src/components/Dashboard.jsx` — central view, composes widgets
- `aegis_cockpit/src/components/AIStreamPanel.jsx` — live AI stream and typewriter feed
- `aegis_cockpit/src/components/IncidentPanel.jsx` — incident list + detail + timeline
- `aegis_cockpit/src/components/TopologyPanel.jsx` — service graph
- `aegis_cockpit/src/components/MetricsPanel.jsx` / `MetricsCharts.jsx` — metrics UI
- `aegis_cockpit/src/components/ScaleControls.jsx` — manual scaling UI
- `aegis_cockpit/src/utils/textSanitize.js` — small sanitizer for AI text (added)

Build/runtime:
- `aegis_cockpit/Dockerfile` — multi-stage (node build → nginx). Built assets live in `/usr/share/nginx/html` inside the container.
- `aegis_cockpit/nginx.conf` — site config used in container (we may have runtime edits in the running container).

Notes:
- Routes like `/login` are client-side (React Router) and exist in built JS assets; the server only serves the SPA index + assets.

---

## Backend (Agent / Core)
Key files/services:
- `aegis_core/app/main.py` — FastAPI entrypoint, includes REST endpoints, WebSocket endpoint `/ws`, and the remediation pipeline.
- `aegis_core/app/ai_brain.py` — LLM orchestration, streaming and non-streaming analysis, RAG retrieval using `data/runbook.json`.
- `aegis_core/app/docker_ops.py` — Docker SDK helpers: `restart_container`, `scale_up`, `scale_down`, `get_all_metrics`, `reconfigure_nginx`.
- `aegis_core/app/verification.py` — `verify_health` and `append_to_runbook` (persist learning to runbook)
- `aegis_core/app/models.py` — Pydantic models (AIAnalysis, IncidentResult, WSFrame types).
- `aegis_core/app/ws_manager.py` — websocket manager to broadcast frames to clients.
- `aegis_core/app/slack_notifier.py` — optional Slack notifications.

REST endpoints (all served on agent, e.g. `http://localhost:8001`):
- `POST /webhook` — receive incident, starts remediation (background task)
- `GET /incidents` — list incidents
- `GET /incidents/{id}` — get single incident
- `GET /containers` — list docker containers
- `GET /metrics` — live metrics for containers
- `POST /scale/{direction}` — manual scale up/down
- `GET /health` — healthcheck for agent
- `GET /topology` — return nodes/edges for UI graph
- `GET /runbook` — return persisted RAG corpus
- `GET /rag/test` — helper: run RAG retrieval
- `WebSocket /ws` — live frames for UI

WebSocket frame types (UI expects these):
- `incident.new`, `status.update`, `ai.thinking`, `ai.stream`, `ai.complete`, `council.vote`, `council.decision`, `docker.action`, `scale.event`, `health.check`, `metrics`, `container.list`, `topology`, `resolved`, `failed`, `heartbeat`.

---

## Data flows & pipeline (high level)
1. `POST /webhook` with incident payload.
2. Pipeline: RAG retrieval (TF-IDF on `runbook.json`) → streaming AI analysis (`ai.thinking` / `ai.stream`) → final JSON analysis (`ai.complete`) → multi-agent council review (security + auditor) → execute action (restart / scale) → health verification (`verify_health`) → append runbook entry on success.
3. All stages broadcast WebSocket frames to the cockpit for live UI updates.

---

## Test checklist (run these step-by-step)
1. Health & infra
```bash
curl -s http://localhost:8001/health | jq .
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -s http://localhost:3000 | head -n 20
```

2. REST endpoints
```bash
curl -s http://localhost:8001/incidents | jq .
curl -s http://localhost:8001/containers | jq .
curl -s http://localhost:8001/metrics | jq .
curl -s http://localhost:8001/topology | jq .
curl -s http://localhost:8001/runbook | jq .
```

3. WebSocket + pipeline (E2E)
```bash
curl -X POST http://localhost:8001/webhook -H 'Content-Type: application/json' -d '{"incident_id":"TEST-E2E-001","container_name":"buggy-app-v2","alert_type":"Network Timeout","severity":"HIGH","logs":"Network timeout: connection to upstream failed repeatedly."}'
# Then poll:
curl -s http://localhost:8001/incidents/TEST-E2E-001 | jq .
curl -s http://localhost:8001/runbook | jq .
```

4. Manual scale
```bash
curl -s -X POST "http://localhost:8001/scale/up?count=2" | jq .
curl -s -X POST "http://localhost:8001/scale/down" | jq .
```

5. RAG test
```bash
curl -s "http://localhost:8001/rag/test?logs=network+timeout+connection+refused" | jq .
```

6. UI checks
- Open `http://localhost:3000` in browser and verify the AI stream, activity, incidents, topology and metrics update live.

---

## Notes & housekeeping
- If the SPA still serves stale `/login` behavior, rebuild the front-end or copy `dist` into the running container and reload nginx:
  - Build & copy (fast, applied in current environment):
    ```bash
    cd aegis_cockpit
    npm install
    npm run build
    docker cp dist/. aegis-cockpit:/usr/share/nginx/html
    docker exec aegis-cockpit nginx -s reload
    ```
  - Full rebuild (preferred when Docker registry access is OK):
    ```bash
    cd aegis_cockpit
    npm install
    npm run build
    DOCKER_BUILDKIT=1 docker build -t aegisops-aegis-cockpit:latest -f Dockerfile .
    docker compose up -d --no-deps --build aegis-cockpit
    ```

- Safety recommendation: add an `AUTO_REMEDIATION` toggle and a `CONFIDENCE_THRESHOLD` to require manual approval for actions below threshold (helps go from POC → MVP safely).

---

If you want, I will: (pick one)
- add an `AUTO_REMEDIATION` config + manual approval endpoint and UI, or
- add unit/integration tests (mock LLM + docker), or
- produce a ready-to-run QA checklist markdown (with expected outputs) and commit it.

File created by automation: `docs/repo-overview.md` — update as needed.
