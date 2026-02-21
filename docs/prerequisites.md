# Prerequisites & Setup Guide — AegisOps GOD MODE v2.0

## System Requirements

### Hardware

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8 GB+ (16 GB if running Ollama locally) |
| Disk | 3 GB free | 10 GB+ (Docker images + Ollama models) |
| OS | Windows 10, macOS 11, Ubuntu 20.04 | Any modern 64-bit OS |

### Software Requirements

#### 1. Docker & Docker Compose (Required)

- **Docker Desktop** v20.10+ or Docker Engine v20.10+
- **Docker Compose** v2.0+ (included with Docker Desktop)
- Installation: https://docs.docker.com/get-docker/

```bash
# Verify
docker --version
docker compose version
# or for older installations:
docker-compose --version
```

#### 2. Python 3.9+ (Only if running services outside Docker)

```bash
python3 --version
pip3 --version
```

#### 3. Node.js 18+ (Only if developing the React Cockpit outside Docker)

```bash
node --version
npm --version
```

#### 4. Git

```bash
git --version
```

---

## API Keys & Credentials

### Required

#### FastRouter API Key (Primary LLM)

Used to call **Claude Sonnet** (or other models) via FastRouter's OpenAI-compatible gateway.

1. Go to https://fastrouter.ai and create an account
2. Generate an API key
3. Set in `aegis_core/.env`:
```env
FASTRTR_API_KEY=your_api_key_here
FASTRTR_BASE_URL=https://go.fastrouter.ai/api/v1
FASTRTR_MODEL=anthropic/claude-sonnet-4-20250514
```

**Without this key:** AegisOps falls back to Ollama (local). Ollama must be running separately or included in the Docker Compose stack.

### Optional

#### Slack Webhook URL (Notifications)

Sends Block Kit notifications at every pipeline stage.

1. Go to https://api.slack.com/apps → Create New App → From Scratch
2. Enable **Incoming Webhooks**
3. Click **Add New Webhook to Workspace** → select a channel
4. Copy the webhook URL
5. Set in `aegis_core/.env`:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

Without this: notifications are silently skipped; all other functionality is unaffected.

---

## Environment File Reference

Create `aegis_core/.env` (copy from `aegis_core/.env.example` if it exists):

```env
# ── Primary LLM (FastRouter → Claude Sonnet) ────────────────────────
FASTRTR_API_KEY=your_key_here
FASTRTR_BASE_URL=https://go.fastrouter.ai/api/v1
FASTRTR_MODEL=anthropic/claude-sonnet-4-20250514

# ── Fallback LLM (Ollama local) ─────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:latest

# ── Slack (optional) ────────────────────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# ── Docker target ────────────────────────────────────────────────────
TARGET_CONTAINER=buggy-app-v2
HEALTH_URL=http://buggy-app-v2:8000/health

# ── Verification ─────────────────────────────────────────────────────
VERIFY_RETRIES=3
VERIFY_DELAY_SECS=5
HEALTH_TIMEOUT_SECS=5

# ── Scaling ──────────────────────────────────────────────────────────
MAX_REPLICAS=5
NGINX_CONTAINER=aegis-lb

# ── Metrics ──────────────────────────────────────────────────────────
METRICS_INTERVAL_SECS=3

# ── LLM token limit ──────────────────────────────────────────────────
LOG_TRUNCATE_CHARS=2000
```

---

## Project Structure

```
AegisOps/
│
├── docker-compose.yml              # Orchestrates all 5 services
├── README.md
├── REPORT.md
│
├── aegis_core/                     # 🧠 GOD MODE Backend
│   ├── .env                        # 🔑 API keys — CREATE THIS!
│   ├── .env.example                # Template for .env
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app, all routes, WebSocket, metrics loop
│       ├── ai_brain.py             # RAG engine, LLM clients, streaming, council
│       ├── docker_ops.py           # Container restart, scaling, metrics, Nginx reload
│       ├── verification.py         # Health check loop + runbook learning
│       ├── slack_notifier.py       # Slack Block Kit webhook notifications
│       ├── models.py               # All Pydantic data models
│       ├── config.py               # Environment variable configuration
│       └── ws_manager.py           # WebSocket connection manager
│
├── aegis_infra/                    # 🏗️ Buggy App (Target/Victim)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       └── app.py                  # Flask server: /health + triggers + memory daemon
│
├── aegis_cockpit/                  # 🖥️ React SRE Cockpit (Primary UI)
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf                  # Serves built React app on port 3000
│   └── src/
│       ├── App.jsx                 # Routes: / (landing) | /login | /dashboard
│       ├── main.jsx
│       ├── index.css
│       ├── hooks/                  # Custom React hooks
│       └── components/
│           ├── Dashboard.jsx       # Main SRE cockpit, WebSocket client
│           ├── AIStreamPanel.jsx   # Typewriter AI reasoning display
│           ├── IncidentPanel.jsx   # Incident state and timeline
│           ├── MetricsPanel.jsx    # Live metrics display
│           ├── MetricsCharts.jsx   # CPU/memory chart components
│           ├── TopologyPanel.jsx   # Service dependency graph
│           ├── ScaleControls.jsx   # Manual scale-up/down buttons
│           ├── Header.jsx          # Connection status bar
│           ├── LandingPage.jsx     # Marketing landing page
│           └── LoginPage.jsx       # Authentication form
│
├── aegis_lb/                       # ⚖️ Nginx Load Balancer
│   ├── Dockerfile
│   ├── nginx.conf                  # Main nginx config
│   └── upstream.conf               # Dynamically rewritten by AegisOps Core
│
├── aegis_dashboard/                # 📊 Legacy Streamlit Dashboard
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py                      # Streamlit UI (polls REST API)
│
├── data/                           # 📁 Shared sample data
│   ├── runbook.json                # (also at aegis_core/data/runbook.json — live)
│   └── sample_incidents.json       # Sample data for dashboard fallback
│
├── aegis_core/data/                # 📁 Persistent agent data (Docker volume)
│   └── runbook.json                # Live RAG knowledge base (auto-growing)
│
└── docs/                           # 📖 Documentation (this folder)
    ├── overview.md                 # Project overview & architecture summary
    ├── architecture.md             # Deep technical dive
    ├── api-reference.md            # All REST + WebSocket endpoints
    ├── llm-strategy.md             # RAG, LLM providers, council, streaming
    ├── getting-started.md          # Setup & testing workflows
    ├── prerequisites.md            # THIS FILE
    └── problem.md                  # The SRE problem & business case
```

---

## Dependency Reference

### AEGIS CORE (Python)

```
fastapi>=0.104.0          Web framework (async, REST + WebSocket)
uvicorn>=0.24.0           ASGI server
pydantic>=2.0.0           Data validation and serialization
openai>=1.0.0             LLM client (used for FastRouter + Ollama, both OpenAI-compatible)
docker>=7.0.0             Docker Python SDK (container control, metrics)
httpx>=0.25.0             Async HTTP client (health checks, Slack)
scikit-learn>=1.3.0       TF-IDF vectorizer for RAG engine
numpy>=1.24.0             Cosine similarity computation
python-dotenv>=1.0.0      .env file loading
python-dateutil>=2.8.0    Container uptime calculation
```

### AEGIS INFRA (Python)

```
flask>=2.3.0              Web framework
psutil>=5.9.0             System memory monitoring
requests>=2.31.0          Webhook HTTP calls to aegis-agent
```

### AEGIS COCKPIT (JavaScript)

```
react>=18.0.0             UI library
react-router-dom>=6.0.0   Multi-page routing
vite>=5.0.0               Build tool
tailwindcss>=3.0.0        Utility-first CSS framework
```

### AEGIS DASHBOARD (Python)

```
streamlit>=1.28.0         UI framework
requests>=2.31.0          HTTP API polling
pandas>=2.0.0             Data processing
```

---

## Network Configuration

### Docker Compose Network

- **Network name:** `aegis-network` (bridge driver)
- **Service discovery:** containers communicate by container name
  - `aegis-agent:8001` — AegisOps Core REST + WebSocket
  - `buggy-app-v2:8000` — Buggy App (Flask)
  - `aegis-lb:80` — Nginx Load Balancer
  - `aegis-cockpit:3000` — React SRE Cockpit
  - `aegis-dashboard:8501` — Streamlit Dashboard

### Port Mappings (host ← container)

| Service | Container Port | Host Port | Access |
|---------|---------------|-----------|--------|
| Buggy App | 8000 | 8000 | `http://localhost:8000` |
| AegisOps Core | 8001 | 8001 | `http://localhost:8001` |
| SRE Cockpit | 3000 | 3000 | `http://localhost:3000` |
| Nginx LB | 80 | 80 | `http://localhost:80` |
| Legacy Dashboard | 8501 | 8501 | `http://localhost:8501` |

### Docker Socket Access

AegisOps Core mounts `/var/run/docker.sock` to control Docker from inside the container:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This is required for container restart, scaling, and metrics collection.

### Data Volume

Runbook data is persisted on the host via a bind mount:
```yaml
volumes:
  - ./aegis_core/data:/app/data
```

This ensures the RAG knowledge base (`runbook.json`) survives container restarts.

---

## Verification Checklist

After setup, verify everything is working:

```bash
# 1. All containers running
docker-compose ps

# 2. Core API responding
curl http://localhost:8001/health
# Expected: {"status": "ok", "mode": "GOD_MODE", "version": "2.0.0", "ws_clients": 0}

# 3. Buggy App responding
curl http://localhost:8000/health
# Expected: {"status": "ok"}

# 4. SRE Cockpit accessible
curl -I http://localhost:3000
# Expected: HTTP 200

# 5. Load balancer routing
curl http://localhost:80/health
# Expected: {"status": "ok"}

# 6. Send a test incident
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{"incident_id":"setup-test","alert_type":"Memory Leak","logs":"test"}'
# Expected: {"incident_id":"setup-test","status":"RECEIVED",...}

# 7. Check it resolves
sleep 15 && curl -s http://localhost:8001/incidents/setup-test | python3 -c "import sys,json; r=sys.stdin.read(); d=json.loads(r); print(d.get('status','unknown'))" 2>/dev/null || echo "check logs: docker-compose logs aegis-agent"
# Expected: RESOLVED (or FAILED if no API key — check logs)
```

---

## Platform-Specific Notes

### macOS

```bash
# Ensure Docker Desktop is running
open /Applications/Docker.app

# If ports conflict
lsof -i :8001 -i :8000 -i :3000
```

### Linux

```bash
# Start Docker daemon
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (avoid needing sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Windows

Use **Docker Desktop for Windows** (WSL2 backend recommended).  
Run all commands in **PowerShell** or **Git Bash**.  
If port 80 conflicts with IIS, change the LB port in `docker-compose.yml`:
```yaml
aegis-lb:
  ports:
    - "8080:80"   # Use 8080 instead
```

---

## Additional Resources

| Resource | URL |
|----------|-----|
| Docker Documentation | https://docs.docker.com/ |
| FastAPI Guide | https://fastapi.tiangolo.com/ |
| FastRouter | https://fastrouter.ai |
| Ollama | https://ollama.ai |
| Streamlit Docs | https://docs.streamlit.io/ |
| React Docs | https://react.dev |
| Slack Incoming Webhooks | https://api.slack.com/messaging/webhooks |
