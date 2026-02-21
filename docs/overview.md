# AegisOps: Autonomous SRE Agent - Project Overview

## What is AegisOps?

**AegisOps** is an AI-powered **Autonomous Site Reliability Engineering (SRE) Agent** that automatically detects, analyzes, and resolves infrastructure incidents in real-time. It's designed to reduce Mean Time to Resolution (MTTR) and human intervention by leveraging AI to diagnose root causes and execute remediation actions.

Think of it as a **24/7 autonomous on-call engineer** that:
- 🚨 Detects anomalies and SLO breaches
- 🧠 Uses AI to analyze root causes from logs
- ⚡ Automatically executes fix actions (container restart, scaling, rollback, etc.)
- ✅ Verifies health post-remediation
- 📚 Learns from each incident and grows a knowledge base

---

## High-Level Architecture

AegisOps is a **3-component distributed system** orchestrated with Docker Compose:

```
┌─────────────────────────────────────────────────────────┐
│              Docker Compose Orchestrator                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐   ┌──────────────────┐            │
│  │ AEGIS CORE       │   │ BUGGY APP        │            │
│  │ (Port 8001)      │   │ (Port 8000)      │            │
│  │ - AI Brain       │   │ - Flask Server   │            │
│  │ - Docker Ops     │   │ - Health Endpoints│           │
│  │ - Webhook Server │   │ - Incident Triggers│          │
│  │ - Verification   │   │ - Memory/CPU Hogs │           │
│  └──────────────────┘   └──────────────────┘            │
│           ▲                      │                       │
│           │ (webhook calls)      │ (sends alerts)       │
│           └──────────────────────┘                       │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ AEGIS DASHBOARD (Port 8501)                          ││
│  │ - Streamlit UI                                       ││
│  │ - Real-time metrics & incident lifecycle             ││
│  │ - Incident history & runbook viewer                  ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Three Core Components

### 1. **AEGIS CORE** (The Brain & Executor)
**Location:** `aegis_core/`  
**Port:** `8001`  
**Tech Stack:** FastAPI, Docker SDK, Gemini/Ollama AI, Slack Notifier  
**Owner:** Development Team 1 (P - The Brain)

**Responsibilities:**
- Runs a FastAPI server with a `/webhook` endpoint
- Receives incident alerts from the Buggy App
- **Analyzes logs using AI** (FastRouter/Gemini → Ollama fallback)
- **Executes remediation actions** (restarts target container)
- **Verifies health** with retry logic
- **Learns** by appending solved incidents to `runbook.json`
- **Notifies** via Slack on status changes

**Key Files:**
- `main.py` - FastAPI server and remediation pipeline
- `ai_brain.py` - LLM integration (primary + fallback)
- `docker_ops.py` - Docker container control
- `verification.py` - Health check loop
- `slack_notifier.py` - Incident notifications

---

### 2. **AEGIS INFRA** (The Target / Buggy App)
**Location:** `aegis_infra/`  
**Port:** `8000`  
**Tech Stack:** Flask, OpenTelemetry, psutil  
**Owner:** Development Team 2 (A - The Hands)

**Responsibilities:**
- Runs an intentionally buggy Flask app
- Provides health check endpoint (`/health`)
- Exposes **incident trigger endpoints**:
  - `/trigger_memory` - Simulates memory leak
  - `/trigger_cpu` - Infinite factorial loop (CPU spike)
  - `/trigger_db_latency` - 5-second sleep (simulated DB lock)
- Monitors memory usage via daemon thread
- Sends webhook alerts to AegisOps Core when thresholds exceeded
- The **victim** that the AI agent must fix

**Key Files:**
- `src/app.py` - Flask server with triggers
- `otel_config.yaml` - OpenTelemetry configuration
- `Dockerfile` - Container definition

---

### 3. **AEGIS DASHBOARD** (The Face / UI)
**Location:** `aegis_dashboard/`  
**Port:** `8501`  
**Tech Stack:** Streamlit, Requests, Pandas  
**Owner:** Development Team 3 (S - The Face)

**Responsibilities:**
- Real-time visualization of infrastructure status
- Displays incident lifecycle (5 stages):
  1. **Nominal** - All systems OK
  2. **Anomaly** - SLO breach detected
  3. **AI Brain** - AI diagnosing
  4. **Action** - Remediation executing
  5. **Verification** - Health check post-fix
- Shows metrics: CPU, Memory, System Health
- Displays runbook (learned solutions)
- Shows business impact: money saved
- **Isolated** - only consumes APIs, doesn't execute

**Key Files:**
- `app.py` (or `dashboard.py`) - Streamlit application

---

## Data Flow / Incident Lifecycle

```
1. BUGGY APP
   └─→ Memory usage hits 85%
   └─→ Sends webhook to AEGIS CORE (/webhook)

2. AEGIS CORE receives payload:
   {
     "incident_id": "uuid",
     "container_name": "buggy-app-v2",
     "alert_type": "Memory Leak",
     "logs": "...",
     "timestamp": "ISO-8601"
   }

3. AEGIS CORE processes (async pipeline):
   ├─→ AI BRAIN: Analyzes logs → returns:
   │   {
   │     "root_cause": "Memory leak in event handler",
   │     "action": "RESTART",
   │     "justification": "..."
   │   }
   │
   ├─→ DOCKER OPS: Restarts buggy-app-v2 container
   │
   ├─→ VERIFICATION: Health-checks (with retries)
   │   └─→ GET http://buggy-app-v2:8000/health
   │
   └─→ LEARNING: Appends to runbook.json
       {
         "timestamp": "2:05 AM",
         "issue": "Memory Leak - Event Handler Leaking",
         "fix": "Restart Container"
       }

4. SLACK NOTIFIER: Posts status updates to Slack

5. DASHBOARD: Displays incident lifecycle in real-time
```

---

## Key Features

### 🤖 AI-Driven Diagnostics
- **Dual LLM Strategy**: Tries FastRouter (cloud, fast) first; falls back to Ollama (local, open-source)
- **Token Safety**: Truncates logs to last 2000 chars to prevent token overflow
- **Structured Output**: Forces JSON responses for deterministic parsing

### 🔄 Automated Remediation
- **Action Types**: `RESTART`, `SCALE_UP`, `ROLLBACK`, `NOOP`
- **Currently Implemented**: Container restart
- **Extensible**: Easy to add new action types

### ✅ Health Verification
- **Retry Logic**: Tests health endpoint with exponential backoff
- **Timeout**: 5-second default timeout per check
- **All-or-Nothing**: Success = resolved, failure = marked FAILED

### 📚 Knowledge Base (Runbook)
- Automatically grows with each resolved incident
- Stores: timestamp, issue type, applied fix
- **Bonus Challenge**: Can be used to suggest fixes for future similar incidents

### 📡 Slack Integration
- Real-time status updates at each pipeline stage
- Incident context and AI analysis
- Error details for debugging

### 🎨 Real-Time Dashboard
- Simulated incident lifecycle visualization
- Business impact metrics
- Runbook viewer
- Developer simulation controls

---

## Technology Stack

| Component | Tech | Purpose |
|-----------|------|---------|
| **Orchestration** | Docker Compose | Run all 3 services together |
| **AEGIS CORE** | FastAPI | High-performance async API |
| **AI Brain** | Gemini/Ollama | Root cause analysis |
| **Docker Ops** | Docker SDK | Container management |
| **AEGIS INFRA** | Flask | Target application |
| **Health Monitor** | psutil | Resource monitoring |
| **Dashboard** | Streamlit | Interactive UI |
| **Notifications** | Slack API | Real-time alerts |
| **Logging** | Python logging | Structured logs |

---

## Why AegisOps Matters

### The Problem (Before AegisOps)
- 📞 On-call engineer woken up at 3 AM for a memory leak
- ⏱️ 15-20 minutes to diagnose and fix (MTTR)
- 💰 Every minute of downtime costs money
- 😫 Manual, repetitive, error-prone

### The Solution (With AegisOps)
- 🤖 Automatic detection in seconds
- 🧠 AI diagnoses root cause instantly
- ⚡ Action executes within 1-2 seconds
- ✅ Verification confirms resolution
- 💼 Dashboard tracks business impact ($$ saved)

### ROI
- **Reduced MTTR**: 15 min → 5 sec (180x faster)
- **Human toil**: Near-zero
- **Runbook**: Continuously grows with AI learning
- **Scalability**: Handles multiple incidents in parallel

---

## Deployment & Environment

- **Environment File**: `.env` (must include API keys: `GEMINI_API_KEY`, `SLACK_BOT_TOKEN`)
- **Network**: Docker bridge network (`aegis-network`)
- **Restart Policy**: `unless-stopped` (auto-recovery)
- **Ports**:
  - `8000` - Buggy App
  - `8001` - AegisOps Core API
  - `8501` - Dashboard

---

## Next Steps / Usage

1. **Setup**: See [prerequisites.md](prerequisites.md)
2. **Run**: `docker-compose up --build`
3. **Test**: Trigger incidents via `/trigger_*` endpoints
4. **Monitor**: Visit dashboard at `http://localhost:8501`
5. **Debug**: Check logs via `docker-compose logs -f`

---

## Project Status

🚀 **Early-stage Proof of Concept** - Designed for hackathon/demo  
✅ Core remediation pipeline working  
⚙️ Extensible for production-grade features  
📈 Ready for incident simulation and AI validation
