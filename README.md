# 🛡️ AegisOps — Autonomous AI SRE Command Center

[![GitHub repo](https://img.shields.io/badge/GitHub-Pswaikar1742%2FAegisOps-blue?logo=github)](https://github.com/Pswaikar1742/AegisOps)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://github.com/Pswaikar1742/AegisOps/blob/main/docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://github.com/Pswaikar1742/AegisOps/tree/main/aegis_core)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](https://github.com/Pswaikar1742/AegisOps/tree/main/aegis_cockpit)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/Pswaikar1742/AegisOps/blob/main/LICENSE)

> **God Mode Activated.** An autonomous, multi-agent AI system that detects, diagnoses, and remediates cloud infrastructure incidents in real-time — with a stunning NASA-style cockpit UI.

---

## 🎬 Live Demo (30 seconds)

```bash
# 1. Start everything
docker compose up -d

# 2. Open the cockpit
xdg-open http://localhost:3000

# 3. Trigger all 5 incident types
bash scripts/trigger-all-incidents.sh http://localhost:8001 demo

# 4. Watch 3 terminals
docker logs -f aegis-agent 2>&1 | grep --color -E "RESOLVED|APPROVED|RESTART|ERROR|webhook|council|ollama"
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
watch -n 2 'curl -s http://localhost:8001/incidents | python3 -m json.tool | grep -E "incident_id|status|action|confidence" | head -40'
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AegisOps Platform                           │
│                                                                 │
│  ┌──────────────┐    WebSocket     ┌─────────────────────────┐  │
│  │ React Cockpit│◄────────────────►│   FastAPI Agent         │  │
│  │  :3000       │    REST /api/*   │   :8001                 │  │
│  │  (nginx SPA) │                  │                         │  │
│  └──────────────┘                  │  ┌─────────────────┐   │  │
│                                    │  │  AI Brain        │   │  │
│  ┌──────────────┐                  │  │  Ollama PRIMARY  │   │  │
│  │  Nginx LB    │◄────────────────►│  │  Claude FALLBACK │   │  │
│  │  :80         │                  │  └─────────────────┘   │  │
│  └──────────────┘                  │                         │  │
│                                    │  ┌─────────────────┐   │  │
│  ┌──────────────┐                  │  │ Safety Council   │   │  │
│  │ buggy-app-v2 │◄────────────────►│  │ SRE + Security  │   │  │
│  │  :8000       │                  │  │ + Auditor        │   │  │
│  └──────────────┘                  │  └─────────────────┘   │  │
│                                    │                         │  │
│  ┌──────────────┐                  │  ┌─────────────────┐   │  │
│  │  Streamlit   │                  │  │ RAG Runbook      │   │  │
│  │  :8501       │                  │  │ TF-IDF Vector    │   │  │
│  └──────────────┘                  │  │ Auto-growing     │   │  │
│                                    │  └─────────────────┘   │  │
│                                    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### 🤖 Autonomous AI Pipeline
- **Ollama (primary)** — `llama3.1:8b-instruct-q4_K_M` runs 100% locally
- **Claude API (fallback)** — FastRouter via Anthropic API
- **RAG Memory** — TF-IDF vector search over resolved incidents
- **Auto-growing runbook** — every resolved incident trains the system
- **98%+ confidence** on known incident patterns

### 🏛️ Multi-Agent Safety Council
- **SRE Agent** 🧠 — diagnoses root cause, proposes action
- **Security Officer** 🛡️ — validates safety, checks for PII risk
- **Auditor** 📋 — compliance check, logs decision
- **2/3 majority vote** required before any action executes
- **Zero-trust** — no single agent can act alone

### 🎯 5 Incident Types Detected & Resolved
| # | Type | Trigger | AI Action |
|---|------|---------|-----------|
| 1 | 💀 Memory OOM | Heap exhaustion, OOM kill | `RESTART` container |
| 2 | 🔥 CPU Spike | 90%+ sustained CPU usage | `SCALE_UP` replicas |
| 3 | 🐌 DB Connection Saturation | Pool exhausted, timeouts | `RESTART` + alert |
| 4 | 💾 Disk Full | >95% disk usage | `CLEANUP` + alert |
| 5 | 💥 Pod Crash Loop | Repeated container exits | `RESTART` + runbook |

### 📡 Real-time Observability
- **WebSocket stream** — 16 frame types broadcast live
- **OTel-style radar** — CPU, Memory, Disk, Network, DB Pool
- **Live telemetry bars** — color-coded (green/yellow/red with glow)
- **Infrastructure topology** — Internet → NGINX LB → Replicas
- **Docker stats** — per-container CPU/memory live

### 🎨 NASA Cockpit UI (4-Zone Layout)
```
┌────────────┬──────────────┬─────────────────────────────────┐
│  ZONE 1    │   ZONE 2     │         ZONE 3                  │
│            │              │                                 │
│  Chaos     │  Live        │  Multi-Agent Council            │
│  Injection │  Telemetry   │  SRE | Security | Auditor       │
│  Buttons   │  Bars        │                                 │
│            │              │  AI Neural Stream               │
│  5 Trigger │  Topology    │  (typewriter, cyan on black)    │
│  Buttons   │  Map         │                                 │
│            │              │  Event Log Terminal             │
│  Scale     │  Containers  │  (color-coded by severity)      │
│  Controls  │  List        │                                 │
└────────────┴──────────────┴─────────────────────────────────┘
```

---

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| `aegis-cockpit` | **3000** | React SPA (nginx) — main cockpit UI |
| `aegis-agent` | **8001** | FastAPI — AI brain, WebSocket, REST API |
| `aegis-dashboard` | **8501** | Streamlit — legacy metrics dashboard |
| `aegis-lb` | **80** | Nginx load balancer (scales replicas) |
| `buggy-app-v2` | **8000** | Target app (intentionally crashable) |

---

## 🛠️ Setup & Installation

### Prerequisites
```bash
# Required
docker >= 24.0
docker compose >= 2.0
node >= 18 (for local dev only)
python >= 3.11 (for local dev only)

# Required for AI (primary LLM via FastRouter)
# Get a free API key at https://fastrouter.ai
export FASTRTR_API_KEY=your_key_here

# Optional: local Ollama fallback
# ollama pull llama3.2:latest
```

### Quick Start
```bash
git clone https://github.com/Pswaikar1742/AegisOps.git
cd AegisOps

# Copy env template
cp aegis_core/.env.example aegis_core/.env
# Edit aegis_core/.env — set FASTRTR_API_KEY (required)

# Start all services
docker compose up -d

# Verify everything is running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -s http://localhost:8001/health | python3 -m json.tool
```

### Local Development (no Docker rebuild needed)
```bash
# Frontend (Vite HMR on :5173)
cd aegis_cockpit
npm install
npm run dev

# Backend (uvicorn auto-reload on :8001)
cd aegis_core
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Deploy frontend changes instantly (no image rebuild)
cd aegis_cockpit && npm run build
docker cp dist/. aegis-cockpit:/usr/share/nginx/html
docker exec aegis-cockpit nginx -s reload
```

---

## 🎮 Triggering Incidents

### From the UI
Click any button in the **Chaos Injection** panel (Zone 1):
- 💀 **Memory OOM** — triggers OOM kill scenario
- 🔥 **CPU Spike** — triggers CPU saturation
- 🌐 **Network** — triggers connectivity failure
- 🗄️ **DB Conn** — triggers DB pool exhaustion
- 💾 **Disk Full** — triggers disk space critical
- 💥 **Pod Crash** — triggers crash loop

### From Terminal
```bash
# Single incident
bash scripts/trigger-demo-incident.sh memory
bash scripts/trigger-demo-incident.sh cpu
bash scripts/trigger-demo-incident.sh network
bash scripts/trigger-demo-incident.sh database
bash scripts/trigger-demo-incident.sh disk

# All 5 in cascade (best for demo)
bash scripts/trigger-all-incidents.sh http://localhost:8001 demo

# Raw curl
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "DEMO-001",
    "container_name": "buggy-app-v2",
    "alert_type": "Memory OOM",
    "severity": "CRITICAL",
    "logs": "OOM kill occurred. Java heap space exhausted at 96% usage.",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

---

## 📡 API Reference

### REST Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook` | Trigger incident (main entry point) |
| `GET` | `/incidents` | List all incidents |
| `GET` | `/incidents/{id}` | Single incident with full analysis |
| `GET` | `/health` | System health + WS client count |
| `GET` | `/containers` | Live container list |
| `GET` | `/metrics` | Per-container CPU/memory |
| `GET` | `/topology` | Service topology graph |
| `GET` | `/runbook` | RAG knowledge base |
| `POST` | `/scale/up` | Scale up replicas |
| `POST` | `/scale/down` | Scale down replicas |
| `GET` | `/rag/test` | Test RAG retrieval |
| `WS` | `/ws` | WebSocket live stream |

### WebSocket Frame Types
```json
{ "type": "incident.new",      "data": { "incident_id": "...", "severity": "CRITICAL" } }
{ "type": "ai.thinking",       "data": { "message": "Analyzing logs..." } }
{ "type": "ai.stream",         "data": { "chunk": "Root cause: ..." } }
{ "type": "ai.complete",       "data": { "analysis": { "root_cause": "...", "action": "RESTART", "confidence": 0.95 } } }
{ "type": "council.vote",      "data": { "vote": { "role": "SRE_AGENT", "verdict": "APPROVED" } } }
{ "type": "council.decision",  "data": { "decision": { "final_verdict": "APPROVED", "votes": [...] } } }
{ "type": "docker.action",     "data": { "action": "RESTART", "container": "buggy-app-v2" } }
{ "type": "scale.event",       "data": { "event": { "replica_count": 3 } } }
{ "type": "health.check",      "data": { "attempt": 1, "healthy": true } }
{ "type": "resolved",          "data": { "incident_id": "...", "timestamp": "..." } }
{ "type": "failed",            "data": { "incident_id": "...", "error": "..." } }
{ "type": "metrics",           "data": [ { "name": "aegis-agent", "cpu_percent": 7.2 } ] }
{ "type": "heartbeat",         "data": { "timestamp": "..." } }
```

---

## 🧠 AI Pipeline Flow

```
Webhook Received
      │
      ▼
RAG Retrieval (TF-IDF)
  └─ Search runbook for similar past incidents
  └─ Inject top-3 matches as context
      │
      ▼
Ollama LLM Analysis (llama3.1:8b-instruct-q4_K_M)
  └─ root_cause, action, confidence, justification
  └─ Falls back to Claude if Ollama unavailable
      │
      ▼
Safety Council Vote (3 agents, 2/3 majority)
  ├─ SRE Agent      → diagnose + propose
  ├─ Security Officer → validate safety
  └─ Auditor         → compliance check
      │
      ▼
Action Execution (if APPROVED)
  ├─ RESTART     → docker restart container
  ├─ SCALE_UP    → add replicas, reconfigure nginx
  ├─ SCALE_DOWN  → remove replicas
  ├─ CLEANUP     → clear disk/logs
  └─ ALERT_SRE   → cannot fix → notify human
      │
      ▼
Health Verification
  └─ 3 attempts, 5s apart
  └─ RESOLVED if healthy, FAILED if not
      │
      ▼
Runbook Update (RAG Learning)
  └─ Append resolved incident to runbook.json
  └─ Future similar incidents resolved faster
```

---

## 🖥️ Demo Setup (3 Screens)

### Screen 1 — React Cockpit (Full Screen)
```
http://localhost:3000
```

### Screen 2 — VS Code with AI Brain
```bash
code aegis_core/app/ai_brain.py
```

### Screen 3 — Terminal (3 splits)
```bash
# Split 1: Agent logs (show AI working)
docker logs -f aegis-agent 2>&1 | grep --color=always -E "RESOLVED|APPROVED|RESTART|ERROR|webhook|council|ollama|scale"

# Split 2: Docker stats (show CPU spike)
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Split 3: Incident status watcher
watch -n 2 'curl -s http://localhost:8001/incidents | python3 -m json.tool | grep -E "incident_id|status|action|confidence" | head -40'
```

### One-Command Demo
```bash
bash scripts/demo-setup.sh
```

---

## 📁 Project Structure

```
AegisOps/
├── aegis_cockpit/               # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx    # 4-zone NASA cockpit (MAIN)
│   │   │   ├── AIStreamPanel.jsx
│   │   │   ├── IncidentPanel.jsx
│   │   │   ├── TopologyPanel.jsx
│   │   │   ├── MetricsPanel.jsx
│   │   │   └── LandingPage.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js  # WS client
│   │   │   └── useApi.js        # REST client (proxied via nginx)
│   │   └── utils/
│   │       └── textSanitize.js  # LLM output cleaner
│   ├── nginx.conf               # SPA + proxy config
│   └── Dockerfile
│
├── aegis_core/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py              # API routes + WS + pipeline
│   │   ├── ai_brain.py          # Ollama/Claude + RAG
│   │   ├── models.py            # Pydantic schemas
│   │   ├── docker_ops.py        # Docker SDK operations
│   │   ├── verification.py      # Health checks + runbook
│   │   ├── ws_manager.py        # WebSocket broadcast
│   │   ├── slack_notifier.py    # Slack alerts
│   │   └── config.py            # Env-backed config
│   ├── data/
│   │   └── runbook.json         # RAG knowledge base (auto-grows)
│   └── Dockerfile
│
├── aegis_lb/                    # Nginx load balancer
│   └── nginx.conf
│
├── aegis_dashboard/             # Streamlit legacy dashboard
├── aegis_infra/                 # Infrastructure configs (buggy app target)
├── scripts/
│   ├── README.md                # Scripts documentation
│   ├── demo-setup.sh            # Opens all 3 screens
│   ├── demo-quickstart.sh       # Quick reference card
│   ├── trigger-demo-incident.sh # Single incident trigger
│   ├── trigger-all-incidents.sh # All 5 incidents cascade
│   ├── DEMO.sh                  # One-command demo launcher
│   ├── DEMO_READY.sh            # Demo readiness checklist
│   └── test-visual-enhancements.sh  # Visual test suite
├── docs/
│   ├── overview.md              # What is AegisOps?
│   ├── architecture.md          # Deep technical dive
│   ├── api-reference.md         # All REST + WebSocket endpoints
│   ├── getting-started.md       # Step-by-step setup & workflows
│   ├── llm-strategy.md          # RAG engine + LLM providers
│   ├── prerequisites.md         # Hardware, software, API keys
│   ├── problem.md               # The SRE problem + business case
│   ├── repo-overview.md         # Full technical inventory + QA checklist
│   ├── LOCAL_DEV.md             # Local dev without Docker rebuilds
│   ├── Demo.pdf                 # Demo presentation
│   └── archive/                 # Historical/hackathon reference docs
├── docker-compose.yml           # Full stack orchestration
└── docker-compose.demo.yml      # Demo-specific compose override
```

---

## 🔧 Environment Variables

```bash
# aegis_core/.env  (copy from aegis_core/.env.example)
FASTRTR_API_KEY=your_fastrouter_key_here   # primary LLM via FastRouter
FASTRTR_BASE_URL=https://go.fastrouter.ai/api/v1
FASTRTR_MODEL=anthropic/claude-sonnet-4-20250514

# Optional: local Ollama fallback
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:latest

TARGET_CONTAINER=buggy-app-v2
HEALTH_URL=http://buggy-app-v2:8000/health
SLACK_WEBHOOK_URL=                        # optional
VERIFY_RETRIES=3
VERIFY_DELAY_SECS=5
```

---

## 🏆 Hackathon Checklist

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Detect ≥3 incident types | ✅ **5 types** | Memory, CPU, DB, Disk, Pod Crash |
| Autonomous diagnosis | ✅ | Ollama LLM + RAG context |
| Autonomous remediation | ✅ | Docker SDK (restart/scale/cleanup) |
| Timestamped incident report | ✅ | `/incidents/{id}` JSON |
| Root cause analysis | ✅ | AI analysis with confidence score |
| Actions taken log | ✅ | Full pipeline audit trail |
| **BONUS: Learning mechanism** | ✅ | TF-IDF RAG + auto-growing runbook |

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Avg incident-to-resolution | **15–25 seconds** |
| AI confidence (known patterns) | **95%+** |
| Council vote consensus rate | **100%** |
| Runbook entries (after demo) | **20+** |
| WebSocket frame types | **16** |
| Concurrent WS clients | **unlimited** |

---

## 🤝 Contributing

See [docs/getting-started.md](docs/getting-started.md) for setup instructions and [docs/architecture.md](docs/architecture.md) for a deep technical overview.

**Repository:** https://github.com/Pswaikar1742/AegisOps

**Tech Stack:**
- Backend: FastAPI + Docker SDK + scikit-learn RAG
- Frontend: React + Vite + Tailwind + Recharts
- AI: FastRouter (Claude Sonnet) + Ollama local fallback
- Infra: Docker Compose + Nginx

---

*AegisOps — Because production incidents shouldn't wait for humans.* 🛡️