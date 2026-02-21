# AegisOps — Complete Project Report
## For Google AI Studio Context

---

## 1. What is AegisOps?

AegisOps is an **Autonomous SRE (Site Reliability Engineering) Agent** built for a hackathon. It detects infrastructure incidents (memory leaks, CPU spikes, DB latency), diagnoses root causes using an LLM, automatically remediates them (e.g. Docker container restarts), verifies the fix worked, learns from the incident, and notifies the team on Slack — all without human intervention.

**The 30-second pitch:** "Your server crashes at 3 AM. Instead of waking up an engineer, AegisOps detects it, diagnoses it with AI, fixes it, confirms the fix, and sends you a Slack message — all in under 10 seconds."

---

## 2. Team Structure & Branches

| Developer | Branch | Responsibility | Status |
|-----------|--------|---------------|--------|
| Dev 1 (PSW — Lead) | `feature/agent-core` | AI Agent backend (FastAPI + LLM + Docker SDK) | ✅ Complete |
| Dev 2 | `feature/infra-telemetry` | Buggy app that simulates crashes + sends webhooks | ✅ Merged to main |
| Dev 3 | `feature/dashboard-ui` | Streamlit real-time dashboard | ✅ Merged to main |
| Dev 4 (N) | N/A (non-code) | Canva pitch deck, AI Impact Statement, CEO demo | In progress |

### Git History (Simplified)
```
main ← PR#3 (dashboard-ui) ← PR#2 (infra-telemetry) ← PR#1 (agent-core)
  │
  └── feature/agent-core (current working branch, merged main back in)
        ├── 4aace05 Initialize Agent Core structure
        ├── 4848394 feat: implement AegisOps Agent Core backend
        ├── e4238f0 refactor: migrate AI backend from Gemini to FastRouter
        ├── 7a5bb71 feat(phase2): Ollama fallback, hardened Docker, verification retries
        └── 90584ec feat: Slack webhook integration, env fix, CORS enabled
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                       │
│                                                                     │
│  ┌──────────────┐    webhook     ┌──────────────┐    Slack API      │
│  │ buggy-app-v2 │ ──────────▶   │ aegis-agent   │ ──────────────▶  Slack
│  │  (Flask)     │   POST /webhook│  (FastAPI)    │                  │
│  │  Port 8000   │               │  Port 8001    │                  │
│  └──────────────┘               └──────┬───────┘                  │
│         ▲                              │                           │
│         │  docker restart              │  GET /incidents           │
│         └──────────────────────────────┤                           │
│                                        ▼                           │
│                              ┌──────────────────┐                  │
│                              │ aegis-dashboard   │                  │
│                              │  (Streamlit)      │                  │
│                              │  Port 8501        │                  │
│                              └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                           ┌────────────┴────────────┐
                           ▼                         ▼
                    FastRouter API            Ollama (local)
                  (Claude Sonnet 4)         (llama3.2:latest)
                    PRIMARY LLM              FALLBACK LLM
```

---

## 4. Service-by-Service Breakdown

---

### 4.1 `aegis_infra/` — The Buggy App (Dev 2)

**Purpose:** A deliberately crashable Flask app that simulates real infrastructure failures and sends webhook alerts to our agent.

**File:** `aegis_infra/src/app.py` (Flask, gunicorn, port 8000)

**Endpoints:**

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Returns `{"status": "ok"}` — used by the agent to verify recovery |
| `GET /trigger_memory` | Appends 10 MB of random strings to a global list. Triggers memory monitor when usage > 85% |
| `GET /trigger_cpu` | Starts an infinite factorial calculation thread — maxes out CPU |
| `GET /trigger_db_latency` | Sleeps 5 seconds to simulate a database lock |

**Webhook Mechanism:** A background daemon thread (`memory_monitor`) polls `psutil.virtual_memory()` every 2 seconds. When memory exceeds 85%, it POSTs a JSON payload to `http://aegis-agent:8001/webhook` with:
```json
{
  "incident_id": "<uuid>",
  "container_name": "buggy-app-v2",
  "alert_type": "Memory Leak",
  "severity": "CRITICAL",
  "logs": "Memory usage at 92%. Potential OOM imminent.",
  "timestamp": "2026-02-21T10:30:00Z"
}
```

**Docker:** Built from `python:3.10-slim`, runs via gunicorn. Container name is `buggy-app-v2`.

---

### 4.2 `aegis_core/` — The AI Agent (Dev 1 — Our Branch)

**Purpose:** The brain of AegisOps. Receives incident webhooks, uses an LLM to diagnose the root cause, executes remediation (Docker restart), verifies health, learns to a runbook, and notifies Slack.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, OpenAI SDK (pointed at FastRouter + Ollama), Docker SDK, httpx, python-dotenv

**Port:** 8001 (mandatory)

#### Module-by-Module:

---

#### `config.py` — Central Configuration

Loads all environment variables from `.env` via `python-dotenv`. Key variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `FASTRTR_API_KEY` | `sk-v1-ace41f...` | API key for FastRouter (OpenAI-compatible proxy) |
| `FASTRTR_BASE_URL` | `https://go.fastrouter.ai/api/v1` | FastRouter endpoint |
| `FASTRTR_MODEL` | `anthropic/claude-sonnet-4-20250514` | Primary LLM model |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Local Ollama fallback endpoint |
| `OLLAMA_MODEL` | `llama3.2:latest` | Fallback LLM model |
| `LOG_TRUNCATE_CHARS` | `2000` | Max chars sent to LLM (token safety) |
| `TARGET_CONTAINER` | `buggy-app-v2` | Which Docker container to restart |
| `HEALTH_URL` | `http://buggy-app-v2:8000/health` | Health endpoint to verify after restart |
| `VERIFY_DELAY_SECS` | `5` | Seconds to wait between health check retries |
| `VERIFY_RETRIES` | `3` | Number of health check retry attempts |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | Slack Incoming Webhook URL |

---

#### `models.py` — Pydantic Schemas

Defines the data contracts for the entire pipeline:

- **`IncidentPayload`** — Incoming webhook body. Required fields: `incident_id`, `alert_type`. Optional: `logs`, `container_name`, `severity`, `timestamp`. Uses `model_config = {"extra": "allow"}` so Dev 2's extra fields don't cause 422 errors.

- **`ActionType`** — Enum: `RESTART`, `SCALE_UP`, `ROLLBACK`, `NOOP`. The LLM must pick one.

- **`AIAnalysis`** — LLM's structured output: `root_cause` (string), `action` (ActionType), `justification` (string).

- **`ResolutionStatus`** — Enum tracking pipeline state: `ANALYSING` → `EXECUTING` → `RESOLVED` or `FAILED`.

- **`IncidentResult`** — Full incident record: `incident_id`, `alert_type`, `analysis` (nullable), `status`, `resolved_at`, `error`.

- **`RunbookEntry`** — What gets saved to `runbook.json` after a successful fix (learning).

---

#### `ai_brain.py` — LLM Integration (Dual Provider)

**Primary:** FastRouter (cloud) → Claude Sonnet 4 via OpenAI-compatible API
**Fallback:** Ollama (local) → llama3.2:latest

**Flow:**
1. Truncate raw logs to last 2000 chars (token safety — never send full dumps to the API).
2. Build a system prompt that demands strict JSON output with the schema `{root_cause, action, justification}`.
3. Call FastRouter via `openai.OpenAI(base_url=..., api_key=...)`.
4. If FastRouter fails (network error, API key issue, rate limit), catch the exception and retry with Ollama.
5. Parse the JSON response, strip any markdown fences the model might add.
6. Return an `AIAnalysis` Pydantic object.

**Why dual providers?** During the hackathon, if WiFi drops or the API key hits a rate limit, the local Ollama model (running on the RTX 3060) takes over seamlessly. Zero downtime for the demo.

---

#### `docker_ops.py` — Container Management

Uses the Python Docker SDK to interact with the Docker daemon via the mounted socket (`/var/run/docker.sock`).

**Functions:**
- **`restart_container(name, timeout)`** — Locates the container by name, logs pre-restart status, calls `container.restart()`, reloads and logs post-restart status. On `NotFound`, returns a helpful error listing all available containers.
- **`get_container_logs(name, tail)`** — Fetches the last N lines of a container's logs (used for post-mortem when restarts fail).
- **`list_running_containers()`** — Returns `[{name, status, image}]` for all running containers (exposed as a debug API endpoint).

All operations are wrapped in `asyncio.to_thread()` because the Docker SDK is synchronous — this prevents blocking FastAPI's event loop.

---

#### `verification.py` — Health Check & Learning

**Health Check Flow:**
1. Wait `VERIFY_DELAY_SECS` (5s) after restart.
2. Send `GET` to `HEALTH_URL` (buggy-app's `/health`).
3. If HTTP 200 → return `True` (RESOLVED).
4. If not → retry up to `VERIFY_RETRIES` (3) times with 5s gaps.
5. If all attempts fail → return `False` (FAILED).

**Runbook Learning:**
After a successful resolution, `append_to_runbook()` writes a `RunbookEntry` to `aegis_core/data/runbook.json`. This creates a growing knowledge base of past incidents and their fixes — visible on the Streamlit dashboard sidebar.

---

#### `slack_notifier.py` — Slack Alerts

Sends rich Block Kit messages to a Slack channel at each pipeline stage.

**Notification Points:**
1. 🔍 `ANALYSING` — Incident received, AI is thinking
2. ⚙️ `EXECUTING` — AI has diagnosed, action is being taken
3. ✅ `RESOLVED` — Fix worked, health check passed
4. ❌ `FAILED` — Something went wrong (LLM error, Docker error, health check failure)

Each message includes: incident ID, alert type, root cause, recommended action, justification, and error details (if applicable). Uses Slack Block Kit for rich formatting with emojis.

**Safety:** If `SLACK_WEBHOOK_URL` is empty, all calls silently no-op. If the POST fails, it logs a warning but never crashes the pipeline.

---

#### `main.py` — FastAPI App & Pipeline Orchestrator

**Version:** 0.3.0

**Middleware:** CORS enabled with `allow_origins=["*"]` for the Streamlit dashboard and any future React UI.

**The Remediation Pipeline (`_remediate()`):**
This is the core function. It runs as a FastAPI `BackgroundTask` so the webhook returns 200 OK immediately.

```
Step 1: AI Reasoning
  └─ analyze_logs(payload) → AIAnalysis {root_cause, action, justification}
  └─ Slack notify: EXECUTING

Step 2: Execute Action
  └─ If action == RESTART → restart_container("buggy-app-v2")
  └─ If action != RESTART → mark RESOLVED (SCALE_UP/ROLLBACK/NOOP are advisory)
  └─ On Docker failure → capture container logs, Slack notify: FAILED

Step 3: Verify Health
  └─ verify_health() → 3 retries × 5s delay → ping /health
  └─ If healthy → mark RESOLVED, append_to_runbook(), Slack notify: RESOLVED
  └─ If not healthy → mark FAILED, Slack notify: FAILED
```

**API Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST /webhook` | Receive incident alert, kick off pipeline | Returns 200 OK immediately |
| `GET /incidents/{id}` | Poll a specific incident's current status | Used by dashboard |
| `GET /incidents` | List all tracked incidents | Used by dashboard |
| `GET /containers` | Debug: list all running Docker containers | |
| `GET /health` | Agent health check | Returns `{"status": "ok"}` |

**In-memory storage:** Incidents are stored in a Python dict (`incidents: dict[str, IncidentResult]`). Good enough for a hackathon demo — no database needed.

---

### 4.3 `app.py` + `aegis_dashboard/` — Streamlit Dashboard (Dev 3)

**Purpose:** A real-time command center UI that shows the incident lifecycle, system metrics, and the AI runbook.

**Port:** 8501

**How it works:**
1. On load, tries `GET http://aegis-agent:8001/incidents` to fetch live data.
2. Falls back to `data/sample_incidents.json` if the agent is down.
3. Simulates an incident lifecycle in 5 stages using `st.session_state`:
   - Stage 0: 🟢 All Systems Nominal
   - Stage 1: 🔴 Anomaly Detected (SLO breach)
   - Stage 2: 🧠 AI Agent Diagnosing
   - Stage 3: ⚡ Remediation Executing
   - Stage 4: ✅ Verification Passed
4. Sidebar shows the AI Runbook (learned fixes) and business impact ($$ saved).

**Inside Docker:** The dashboard container uses `http://aegis-agent:8001` (Docker network DNS) to talk to the agent.

---

### 4.4 `docker-compose.yml` — The Orchestrator

Defines the entire stack as 3 services on a shared `aegis-network` bridge:

```yaml
services:
  buggy-app-v2:      # Dev 2's crashable app
    build: ./aegis_infra
    ports: 8000:8000

  aegis-agent:        # Our AI agent
    build: ./aegis_core
    ports: 8001:8001
    env_file: ./aegis_core/.env        # Loads all secrets
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # CRITICAL: agent needs Docker access
    depends_on: buggy-app-v2

  aegis-dashboard:    # Streamlit UI
    build: ./aegis_dashboard
    ports: 8501:8501
    depends_on: aegis-agent
```

**Key design decision:** The Docker socket mount (`/var/run/docker.sock`) is what gives the agent the ability to restart `buggy-app-v2` from inside its own container. Without this, `docker_ops.py` would fail with a connection error.

---

## 5. The End-to-End Flow (What Happens When You Trigger a Crash)

```
1. User hits:  curl http://localhost:8000/trigger_memory
                    │
2. buggy-app-v2:   Allocates 10 MB of memory. Memory monitor daemon
                    detects usage > 85%.
                    │
3. buggy-app-v2:   POSTs webhook to http://aegis-agent:8001/webhook
                    {incident_id: "uuid", alert_type: "Memory Leak",
                     severity: "CRITICAL", logs: "Memory at 92%..."}
                    │
4. aegis-agent:     Receives webhook → returns 200 OK immediately.
                    Spawns background task _remediate().
                    │
5. aegis-agent:     Sends logs to FastRouter (Claude Sonnet 4).
                    LLM responds: {root_cause: "memory leak",
                                   action: "RESTART",
                                   justification: "..."}
                    │
6. aegis-agent:     Slack notification → ⚙️ EXECUTING
                    │
7. aegis-agent:     docker restart buggy-app-v2
                    (via Docker SDK + mounted socket)
                    │
8. aegis-agent:     Waits 5s → GET http://buggy-app-v2:8000/health
                    If 200 → RESOLVED. If not → retry 2 more times.
                    │
9. aegis-agent:     Writes to runbook.json (learning).
                    Slack notification → ✅ RESOLVED
                    │
10. aegis-dashboard: Polls GET /incidents → updates UI in real-time.
                     Shows: incident ID, root cause, action taken,
                     resolution status, money saved.
                    │
11. Dev 4's phone:  Slack buzzes with the full incident report.
```

---

## 6. Environment & Runtime

| Component | Technology | Version |
|-----------|-----------|---------|
| Host OS | Linux (RTX 3060 GPU) | — |
| Python (host) | Python | 3.14 |
| Python (containers) | Python | 3.12 (agent/dashboard), 3.10 (buggy app) |
| Web Framework | FastAPI | 0.111+ |
| LLM (primary) | Claude Sonnet 4 via FastRouter | anthropic/claude-sonnet-4-20250514 |
| LLM (fallback) | Ollama local | llama3.2:latest |
| Container Runtime | Docker + Docker Compose | v29.2.0 |
| Dashboard | Streamlit | latest |
| Notifications | Slack Incoming Webhooks | Block Kit |
| GPU | NVIDIA RTX 3060 | For Ollama inference |

---

## 7. Files Inventory

### `feature/agent-core` branch (our work):
```
aegis_core/
├── Dockerfile                    # Builds the agent container (python:3.12-slim + uvicorn)
├── .env                          # Live secrets (git-ignored)
├── .env.example                  # Template for other devs
├── requirements.txt              # fastapi, uvicorn, pydantic, openai, docker, httpx, python-dotenv
├── data/
│   └── runbook.json              # Learning database (grows as incidents are resolved)
├── docs/
│   └── phase-wise.md             # Internal dev notes
└── app/
    ├── __init__.py               # Package marker
    ├── config.py                 # Env var loader (dotenv + os.getenv)
    ├── models.py                 # Pydantic schemas (IncidentPayload, AIAnalysis, etc.)
    ├── ai_brain.py               # LLM integration (FastRouter → Ollama dual-provider)
    ├── docker_ops.py             # Docker SDK operations (restart, logs, list)
    ├── verification.py           # Health check retries + runbook learning
    ├── slack_notifier.py         # Slack Block Kit notifications
    └── main.py                   # FastAPI app, webhook handler, pipeline orchestrator
```

### From `main` branch (Dev 2 + Dev 3):
```
aegis_infra/                      # Dev 2's buggy app
├── Dockerfile
├── requirements.txt              # Flask, psutil, requests, gunicorn
└── src/
    ├── Dockerfile                # (duplicate, unused)
    └── app.py                    # Flask app with /trigger_memory, /trigger_cpu, /trigger_db_latency

aegis_dashboard/                  # Dev 3's Streamlit dashboard (build context)
├── Dockerfile
├── requirements.txt              # streamlit, requests, pandas, streamlit-autorefresh
├── app.py                        # Streamlit command center UI
├── .streamlit/config.toml        # Dark theme config
└── data/
    ├── sample_incidents.json     # Fallback demo data
    └── runbook.json              # Seed runbook

app.py                            # Root-level Streamlit entry (original from Dev 3)
docker-compose.yml                # Orchestrates all 3 services
.gitignore                        # Python + env + node standard ignores
requirements.txt                  # Top-level deps (streamlit, requests, pandas)
data/                             # Shared sample data
.streamlit/config.toml            # Streamlit dark mode config
```

---

## 8. Current Status (21 Feb 2026)

| Check | Status |
|-------|--------|
| All 3 containers running | ✅ `buggy-app-v2`, `aegis-agent`, `aegis-dashboard` |
| Health checks pass | ✅ All 3 return 200 |
| Docker socket mounted | ✅ Agent can restart containers |
| FastRouter LLM working | ✅ Claude Sonnet 4 responds |
| Ollama fallback tested | ✅ llama3.2:latest works locally |
| Slack notifications | ✅ Block Kit messages delivered |
| Dashboard polls agent | ✅ Streamlit hits GET /incidents |
| Webhook accepts Dev 2's payload | ✅ Extra fields tolerated via `extra="allow"` |
| Committed & pushed | ✅ `90584ec` on `feature/agent-core` |
| Chaos testing | 🔄 Ready to execute |

---

## 9. What Still Needs to Happen

1. **Chaos Testing:** Trigger `/trigger_memory`, `/trigger_cpu`, `/trigger_db_latency` and confirm the full pipeline (detect → diagnose → fix → verify → notify) works end-to-end.
2. **Final commit & push** after chaos tests pass.
3. **Dev 4 deliverables:** 6-slide Canva deck, 200-word AI Impact Statement, cost-savings math.
4. **Practice the 3-minute demo pitch.**
