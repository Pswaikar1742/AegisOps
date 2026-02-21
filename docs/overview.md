# AegisOps — GOD MODE v2.0: Autonomous SRE Agent

## What is AegisOps?

**AegisOps** is an AI-powered **Autonomous Site Reliability Engineering (SRE) Agent** that automatically detects, analyzes, and resolves infrastructure incidents in real time. Running in **GOD MODE**, it leverages a multi-agent AI council, a RAG-powered knowledge base, live WebSocket streaming, and automated container scaling to eliminate manual on-call toil.

Think of it as a **24/7 autonomous on-call engineering team** that:

- 🚨 Detects anomalies and SLO breaches the moment they happen
- 📚 Retrieves relevant past incidents from a self-growing runbook (RAG)
- 🧠 Uses AI to analyze root causes and stream reasoning in real time
- 🏛️ Convenes a multi-agent council (SRE → Security → Auditor) for approval
- ⚡ Automatically executes fix actions (restart, scale-up, scale-down, noop)
- 🔧 Reconfigures the Nginx load balancer after scaling events
- ✅ Verifies service health with retry logic post-remediation
- 📖 Learns from every resolved incident, improving future diagnoses
- 📡 Notifies Slack at each pipeline stage
- 🖥️ Streams everything live to the React SRE Cockpit via WebSocket

---

## GOD MODE — Three Pillars

| Pillar | Symbol | Description |
|--------|--------|-------------|
| **Omniscience** | 👁️ | WebSocket streaming of AI reasoning, metrics, and incident state to the SRE Cockpit in real time |
| **Intelligence** | 🧠 | Multi-Agent Council (SRE Agent → Security Officer → Auditor) with majority-vote approval and RAG-augmented analysis |
| **Omnipotence** | ⚡ | Autonomous auto-scaling with Nginx upstream reconfiguration — spawn/destroy replicas without human intervention |

---

## High-Level Architecture — 5-Component System

AegisOps GOD MODE is a **5-service distributed system** orchestrated with Docker Compose:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Docker Compose (aegis-network)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   Browser / Engineer                                                 │
│       │                                                              │
│   ┌───▼──────────────────┐                                          │
│   │ AEGIS COCKPIT         │  React SRE UI    (Port 3000)            │
│   │ - Real-time dashboard  │  WebSocket → aegis-agent:8001/ws       │
│   └───────────────────────┘                                          │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ AEGIS AGENT (GOD MODE Core)                  (Port 8001)      │ │
│   │  FastAPI + WebSocket + Multi-Agent AI                          │ │
│   │  ┌────────────────────────────────────────────────────────┐   │ │
│   │  │ Remediation Pipeline                                    │   │ │
│   │  │  ① RAG Retrieval  (TF-IDF cosine similarity)           │   │ │
│   │  │  ② SRE Analysis   (streaming + non-streaming LLM)      │   │ │
│   │  │  ③ Council Review (SRE + Security + Auditor votes)      │   │ │
│   │  │  ④ Execute Action (restart / scale-up / scale-down)    │   │ │
│   │  │  ⑤ Nginx Reconfigure (if scaling)                      │   │ │
│   │  │  ⑥ Health Verify  (retry loop)                         │   │ │
│   │  │  ⑦ Runbook Learn  (append to RAG corpus)               │   │ │
│   │  └────────────────────────────────────────────────────────┘   │ │
│   └───────────────────────────────────────────────────────────────┘ │
│           ▲                  │                    │                  │
│  webhooks │                  │ Docker API          │ Nginx reload     │
│           │                  ▼                    ▼                  │
│   ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│   │ BUGGY APP     │  │ AEGIS COCKPIT  │  │ AEGIS LB           │    │
│   │ (Port 8000)   │  │ (served above) │  │ (Port 80)          │    │
│   │ Flask target  │  │                │  │ Nginx upstream LB  │    │
│   └───────────────┘  └────────────────┘  └────────────────────┘    │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ AEGIS DASHBOARD (legacy Streamlit)           (Port 8501)      │ │
│   └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Five Components

### 1. AEGIS CORE — The Brain & Executor (GOD MODE Backend)

**Location:** `aegis_core/`  
**Port:** `8001`  
**Tech Stack:** FastAPI, Python, Docker SDK, OpenAI-compatible LLM clients, scikit-learn, httpx, WebSockets  
**Container Name:** `aegis-agent`

**Responsibilities:**
- FastAPI server with REST and WebSocket endpoints
- Receives incident webhooks from the Buggy App
- Runs the full 7-step GOD MODE remediation pipeline asynchronously
- Streams AI reasoning tokens to the React cockpit via WebSocket
- Manages a multi-agent AI council for action approval
- Controls Docker containers (restart, scale-up, scale-down)
- Dynamically reconfigures Nginx upstream after scaling
- Verifies service health with configurable retry logic
- Appends every resolved incident to `runbook.json` (the RAG corpus)
- Broadcasts live container metrics every 3 seconds over WebSocket
- Sends Slack Block Kit notifications at each pipeline stage

**Key Files:**

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, all REST routes, `/ws` WebSocket endpoint, remediation orchestration |
| `app/ai_brain.py` | RAG engine, LLM clients (primary + fallback), streaming, multi-agent council |
| `app/docker_ops.py` | Container restart, scale-up/down, live metrics, Nginx reconfiguration |
| `app/verification.py` | Health check retry loop, runbook append (learning) |
| `app/slack_notifier.py` | Slack Block Kit webhook notifications |
| `app/models.py` | Pydantic schemas for all data models |
| `app/config.py` | Environment variable configuration |
| `app/ws_manager.py` | WebSocket connection manager (broadcast to all cockpit clients) |

---

### 2. AEGIS INFRA — The Buggy App (Target)

**Location:** `aegis_infra/`  
**Port:** `8000`  
**Tech Stack:** Flask, psutil, Python threading  
**Container Name:** `buggy-app-v2`

**Responsibilities:**
- Runs an intentionally buggy Flask app that AegisOps must fix
- Provides a `/health` endpoint used by the verification loop
- Exposes incident trigger endpoints for simulating failures:
  - `GET /trigger_memory` — allocates 10 MB chunks, simulates memory leak
  - `GET /trigger_cpu` — starts infinite factorial loop (CPU spike)
  - `GET /trigger_db_latency` — 5-second sleep (simulates DB lock)
- Runs a background daemon thread that monitors system memory and automatically sends webhook alerts to AegisOps Core when memory exceeds 85%

**Key Files:**

| File | Purpose |
|------|---------|
| `src/app.py` | Flask server with triggers and memory monitor daemon |
| `Dockerfile` | Container definition |

---

### 3. AEGIS COCKPIT — The SRE UI (Primary Interface)

**Location:** `aegis_cockpit/`  
**Port:** `3000`  
**Tech Stack:** React, Vite, Tailwind CSS, Nginx (for serving)  
**Container Name:** `aegis-cockpit`

**Responsibilities:**
- Primary real-time SRE interface (replaces legacy Streamlit dashboard)
- Connects to `aegis-agent:8001/ws` via WebSocket for live event streaming
- Displays a typewriter AI stream panel showing live reasoning tokens
- Shows incident panels (received, analysing, council votes, executing, resolved/failed)
- Renders live container metrics charts
- Visualizes service topology (nodes and edges: agent → app → replicas → LB)
- Provides manual scale-up/scale-down controls
- Multi-page React app: Landing → Login → Dashboard

**Key Files:**

| File | Purpose |
|------|---------|
| `src/App.jsx` | Route definitions (Landing, Login, Dashboard) |
| `src/components/Dashboard.jsx` | Main SRE dashboard, WebSocket client |
| `src/components/AIStreamPanel.jsx` | Typewriter AI reasoning display |
| `src/components/IncidentPanel.jsx` | Incident lifecycle state display |
| `src/components/MetricsPanel.jsx` | Live metrics visualization |
| `src/components/MetricsCharts.jsx` | Chart components for CPU/memory |
| `src/components/TopologyPanel.jsx` | Service dependency graph |
| `src/components/ScaleControls.jsx` | Manual scaling buttons |
| `src/components/Header.jsx` | App header with status indicators |
| `src/components/LandingPage.jsx` | Marketing landing page |
| `src/components/LoginPage.jsx` | Login form |

---

### 4. AEGIS LB — The Nginx Load Balancer

**Location:** `aegis_lb/`  
**Port:** `80`  
**Tech Stack:** Nginx  
**Container Name:** `aegis-lb`

**Responsibilities:**
- Routes incoming HTTP traffic across the Buggy App and its replicas
- Upstream configuration (`upstream.conf`) is dynamically rewritten by AegisOps Core after every scale-up or scale-down event
- Reloads nginx configuration in-place via `nginx -s reload` (zero-downtime)

**Key Files:**

| File | Purpose |
|------|---------|
| `nginx.conf` | Main nginx config (includes upstream.conf) |
| `upstream.conf` | Dynamically rewritten upstream server list |
| `Dockerfile` | Container definition |

---

### 5. AEGIS DASHBOARD — Legacy Streamlit UI

**Location:** `aegis_dashboard/`  
**Port:** `8501`  
**Tech Stack:** Streamlit, Python, Requests  
**Container Name:** `aegis-dashboard`

**Responsibilities:**
- Original Streamlit UI, kept for backwards compatibility
- Polls the AegisOps Core REST API for incident data
- Visualizes CPU/memory metrics, incident lifecycle stages, and runbook entries
- No WebSocket support; uses periodic polling

---

## GOD MODE Remediation Pipeline

When a webhook arrives, AegisOps runs a **7-step async pipeline** entirely in the background:

```
POST /webhook
    │
    ├─① RAG Retrieval
    │   └─ TF-IDF cosine similarity on runbook.json
    │   └─ Top-2 matching past incidents injected into LLM system prompt
    │
    ├─② SRE Analysis (RAG-augmented)
    │   └─ Streaming tokens → WebSocket → React Cockpit (typewriter effect)
    │   └─ Non-streaming call → structured JSON response
    │   └─ Returns: { root_cause, action, justification, confidence, replica_count }
    │
    ├─③ Multi-Agent Council Review
    │   └─ SRE Agent votes (already analysed)
    │   └─ Security Officer LLM reviews safety
    │   └─ Auditor LLM checks compliance
    │   └─ 2/3 majority required to proceed
    │   └─ Each vote broadcast live over WebSocket
    │
    ├─④ Execute Action
    │   ├─ RESTART   → Docker SDK restart container
    │   ├─ SCALE_UP  → Spawn N replica containers on aegis-network
    │   ├─ SCALE_DOWN→ Remove all replica containers
    │   └─ NOOP      → No action, mark resolved immediately
    │
    ├─⑤ Nginx Reconfigure (SCALE_UP only)
    │   └─ Build upstream.conf with original + replicas
    │   └─ Write config via Docker exec + tar
    │   └─ nginx -s reload (zero downtime)
    │
    ├─⑥ Health Verification
    │   └─ HTTP GET /health with configurable retries + delay
    │   └─ All attempts broadcast over WebSocket
    │
    └─⑦ Runbook Learning
        └─ Save logs + root_cause + action + justification to runbook.json
        └─ RAG corpus grows → next incident retrieves this entry
        └─ Recursive self-improvement loop
```

---

## Implemented Features

### 👁️ Omniscience — Real-Time Streaming
- **WebSocket endpoint** (`/ws`) broadcasts every pipeline step to all connected React cockpit clients
- **Typewriter AI stream**: LLM reasoning tokens stream to the UI as they are generated
- **Live container metrics**: CPU %, memory MB/%, network I/O pushed every 3 seconds
- **Container list** kept in sync with the Docker host
- **WebSocket frame types**: `incident.new`, `ai.thinking`, `ai.stream`, `ai.complete`, `council.vote`, `council.decision`, `docker.action`, `scale.event`, `health.check`, `metrics`, `container.list`, `topology`, `resolved`, `failed`, `heartbeat`

### 🧠 Intelligence — Multi-Agent Council
- **SRE Agent** performs primary analysis; always votes APPROVED for its own proposal
- **Security Officer** LLM reviews for safety (rejects dangerous actions like arbitrary code execution)
- **Auditor** LLM checks proportionality and compliance
- **2/3 majority** required; if council rejects, action is blocked and incident marked FAILED
- Each vote includes role, verdict (`APPROVED`/`REJECTED`/`NEEDS_REVIEW`), and reasoning

### 🧠 Intelligence — RAG Knowledge Engine
- **TF-IDF vectorizer** (unigrams + bigrams, sublinear TF, 5000 features) on `runbook.json`
- **Cosine similarity** between current incident logs and all past corpus entries
- **Top-2 retrieval** above 5% similarity threshold — zero external API calls
- Injected as a "RUNBOOK KNOWLEDGE" block in the SRE system prompt
- **Cold start**: if runbook is empty, agent reasons from first principles

### ⚡ Omnipotence — Auto-Scaling
- **Scale-up**: clones the Buggy App container into named replicas (`buggy-app-v2-replica-1`, etc.)
- **Scale-down**: removes all replica containers
- **Nginx reconfigure**: dynamically writes new `upstream.conf` and reloads Nginx in-place
- **Fallback**: if scaling fails, agent falls back to container restart
- **Manual override**: `POST /scale/up?count=N` and `POST /scale/down` REST endpoints

### ⚡ Omnipotence — Action Types
| Action | Description |
|--------|-------------|
| `RESTART` | Restart the target container via Docker SDK |
| `SCALE_UP` | Spawn N replicas + reconfigure Nginx LB |
| `SCALE_DOWN` | Remove all replicas + reconfigure Nginx LB |
| `NOOP` | No action required, mark incident resolved |
| `ROLLBACK` | Defined in models, reserved for future implementation |

### 📡 Slack Notifications
- Slack Block Kit webhooks sent at every significant pipeline stage
- Includes: incident ID, alert type, root cause, proposed action, council votes and verdict, error details
- Non-blocking: notification failure never stops remediation

---

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| **Orchestration** | Docker Compose | v3.8, bridge network |
| **Core Backend** | FastAPI + Uvicorn | Python 3.x, async/await |
| **WebSocket** | FastAPI WebSocket | Real-time bidirectional streaming |
| **Primary LLM** | FastRouter → Claude Sonnet | `anthropic/claude-sonnet-4-20250514` |
| **Fallback LLM** | Ollama (local) | `llama3.2:latest` |
| **RAG Engine** | scikit-learn TF-IDF + numpy | Cosine similarity, zero API cost |
| **Data Validation** | Pydantic v2 | Models for all I/O |
| **Docker Control** | Docker Python SDK | Container restart, scale, metrics |
| **Notifications** | Slack Incoming Webhooks | Block Kit format |
| **HTTP Client** | httpx | Async, for health checks + Slack |
| **Target App** | Flask + psutil | Memory monitor daemon |
| **Load Balancer** | Nginx | Dynamic upstream reconfiguration |
| **SRE Cockpit UI** | React + Vite + Tailwind CSS | WebSocket client, real-time |
| **Legacy Dashboard** | Streamlit | REST polling, backwards compat |

---

## Data Flow — Complete Incident Journey

```
1. INCIDENT TRIGGER
   └─ curl http://localhost:8000/trigger_memory   (human or daemon)
   └─ Buggy App memory monitor detects > 85%
   └─ POST http://aegis-agent:8001/webhook  {incident_id, alert_type, logs, ...}

2. AEGIS CORE receives webhook → returns 200 OK immediately
   └─ Spawns _remediate() as a background task
   └─ Broadcasts incident.new frame to all WebSocket clients

3. RAG RETRIEVAL
   └─ Loads runbook.json → builds TF-IDF corpus
   └─ Computes cosine similarity → retrieves top-2 matches
   └─ Broadcasts ai.thinking "Found N similar past incidents"

4. SRE ANALYSIS (LLM)
   └─ Builds RAG-augmented system prompt
   └─ Streams tokens to React Cockpit (typewriter effect)
   └─ Non-streaming call produces structured JSON
   └─ Example: { root_cause: "memory leak", action: "RESTART", confidence: 0.92 }

5. MULTI-AGENT COUNCIL
   └─ SRE Agent: APPROVED (self-proposed)
   └─ Security Officer LLM: reviews → APPROVED / REJECTED / NEEDS_REVIEW
   └─ Auditor LLM: checks compliance → APPROVED / REJECTED / NEEDS_REVIEW
   └─ Each vote broadcast live over WebSocket
   └─ 2/3 majority → APPROVED → proceed; REJECTED → abort

6. EXECUTE ACTION
   └─ RESTART: Docker SDK restarts buggy-app-v2
   └─ SCALE_UP: Spawns N replicas, then reconfigures Nginx
   └─ SCALE_DOWN: Removes replicas, reconfigures Nginx
   └─ NOOP: Mark resolved immediately

7. HEALTH VERIFICATION
   └─ HTTP GET /health (with configurable retries and delay)
   └─ Each attempt broadcast over WebSocket
   └─ Pass → proceed to learning

8. RUNBOOK LEARNING
   └─ Saves: { incident_id, alert_type, logs, root_cause, action,
               justification, confidence, replicas_used, resolved_at }
   └─ runbook.json grows → next RAG retrieval is richer

9. SLACK + FINAL BROADCAST
   └─ Slack Block Kit notification: RESOLVED / FAILED
   └─ WebSocket broadcast: resolved / failed frame
   └─ Dashboard and Cockpit both update
```

---

## Service Ports

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| Buggy App | `buggy-app-v2` | `8000` | Target Flask app + trigger endpoints |
| AegisOps Core | `aegis-agent` | `8001` | REST API + WebSocket backend |
| SRE Cockpit | `aegis-cockpit` | `3000` | Primary React UI |
| Nginx LB | `aegis-lb` | `80` | Load balancer for buggy app |
| Legacy Dashboard | `aegis-dashboard` | `8501` | Streamlit UI (backwards compat) |

---

## Why AegisOps Matters

### The Problem (Before AegisOps)
- 📞 On-call engineer woken at 3 AM for a memory leak
- ⏱️ 15–30 minutes to diagnose and fix (MTTR)
- 💰 Each minute of downtime costs real money
- 😫 Manual, repetitive, error-prone process
- 🔁 Same incidents solved repeatedly with no institutional memory

### The Solution (With AegisOps GOD MODE)
- 🤖 Automatic detection within seconds of threshold breach
- 📚 RAG retrieves past similar incidents to improve AI diagnosis
- 🧠 Multi-agent council reviews every decision before execution
- ⚡ Container restart or auto-scaling executes in ~1 second
- ✅ Health verification confirms resolution automatically
- 📖 Every incident adds to the knowledge base for future improvement
- 🖥️ Live WebSocket streaming keeps the team informed without polling

### ROI
- **Reduced MTTR**: 15–30 min → 3–10 sec (up to **600× faster**, ~180× on average)
- **Cost per incident**: $7,500 → $25–$67 (>99% reduction)
- **Human toil**: Near-zero for common failure modes
- **Knowledge base**: Continuously self-improves with each resolved incident
- **Scalability**: One AegisOps instance handles hundreds of incidents in parallel

---

## Quick Start

```bash
cd AegisOps
cp aegis_core/.env.example aegis_core/.env
# Edit aegis_core/.env and set FASTRTR_API_KEY (and optionally SLACK_WEBHOOK_URL)

docker-compose up --build
```

| UI | URL |
|----|-----|
| SRE Cockpit (React) | http://localhost:3000 |
| Core API Docs | http://localhost:8001/docs |
| Buggy App health | http://localhost:8000/health |
| Legacy Dashboard | http://localhost:8501 |

**Trigger an incident:**
```bash
curl http://localhost:8000/trigger_memory
```

Watch AegisOps detect, analyze, council-approve, remediate, and resolve — all within seconds, streamed live to the cockpit.

---

## Further Documentation

| Document | Contents |
|----------|---------|
| [architecture.md](architecture.md) | Deep technical dive into every component and the full pipeline |
| [api-reference.md](api-reference.md) | All REST and WebSocket endpoints with request/response examples |
| [llm-strategy.md](llm-strategy.md) | RAG engine, LLM providers, Multi-Agent Council, streaming |
| [getting-started.md](getting-started.md) | Step-by-step setup, testing workflows, debugging |
| [prerequisites.md](prerequisites.md) | Hardware, software, API keys, project structure |
| [problem.md](problem.md) | The SRE problem AegisOps solves and its business case |
