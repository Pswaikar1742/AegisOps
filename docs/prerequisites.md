# Prerequisites & Setup Guide

## System Requirements

### Hardware
- **CPU**: 2+ cores (for parallel container runs and AI inference)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Disk**: 2GB free space (for Docker images and logs)
- **OS**: Windows, macOS, or Linux

### Software Requirements

#### 1. **Docker & Docker Compose**
- **Docker Desktop**: v20.10+ or Docker Engine
- **Docker Compose**: v2.0+
- Installation: [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)

**Verify installation:**
```bash
docker --version
docker-compose --version
```

#### 2. **Python** (if running outside containers)
- **Python 3.9+**
- **pip** package manager
- Installation: [https://www.python.org/downloads/](https://www.python.org/downloads/)

**Verify:**
```bash
python --version
pip --version
```

#### 3. **Git**
- For cloning and version control
- Installation: [https://git-scm.com/](https://git-scm.com/)

---

## API Keys & Credentials Required

Create a `.env` file in the **project root** (`AegisOps/` directory):

```env
# ── Gemini API (Primary LLM) ──────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── FastRouter API (Optional, used if GEMINI fails) ──
FASTRTR_API_KEY=your_fastrtr_api_key_here
FASTRTR_BASE_URL=https://api.fastrtr.com/v1
FASTRTR_MODEL=gpt-4-turbo

# ── Ollama (Fallback LLM - runs locally, no key needed) ──
OLLAMA_BASE_URL=http://ollama:11434/v1
OLLAMA_MODEL=mistral

# ── Slack Integration ──────────────────────────────────
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C01234567890

# ── OpenTelemetry (Optional) ──────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=aegis-infra
```

### How to Get API Keys

#### **Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Create new API key
4. Copy and paste into `.env`

#### **Slack Bot Token**
1. Go to [Slack App Dashboard](https://api.slack.com/apps)
2. Create new app or select existing one
3. Navigate to "OAuth & Permissions"
4. Add scopes: `chat:write`
5. Copy Bot Token (`xoxb-...`)

#### **FastRouter Key** (Optional)
- Contact FastRouter support or use their dashboard
- Primary use is as fallback to Gemini

#### **Ollama** (Local, No Key Required)
- Runs locally in a container
- Pre-configured in `docker-compose.yml`
- Can be used without external API keys

---

## Project Structure Overview

```
AegisOps/
├── .env                          # 🔑 API keys (CREATE THIS!)
├── docker-compose.yml            # Orchestrator
├── requirements.txt              # Root dependencies (dashboard)
│
├── aegis_core/                   # 🧠 AI Agent
│   ├── Dockerfile
│   ├── requirements.txt           # fastapi, google-generativeai, docker
│   └── app/
│       ├── main.py               # FastAPI server
│       ├── ai_brain.py           # LLM integration
│       ├── docker_ops.py         # Container control
│       ├── verification.py       # Health checks
│       ├── slack_notifier.py     # Slack alerts
│       ├── models.py             # Data models
│       └── config.py             # Configuration
│
├── aegis_infra/                  # 🏗️ Buggy App (Target)
│   ├── Dockerfile
│   ├── requirements.txt           # flask, opentelemetry, psutil
│   ├── otel_config.yaml          # Observability config
│   └── src/
│       └── app.py                # Flask server with triggers
│
├── data/                         # 📊 Shared data
│   ├── runbook.json              # Learned solutions (auto-grows)
│   └── sample_incidents.json     # Sample data for dashboard
│
└── docs/                         # 📖 Documentation
    ├── overview.md               # This architecture guide
    ├── prerequisites.md          # THIS FILE
    ├── problem.md                # Problem statement
    ├── architecture.md           # Detailed architecture
    ├── api-reference.md          # API endpoints
    ├── llm-strategy.md           # AI engine details
    └── troubleshooting.md        # Common issues & fixes
```

---

## Local Development Setup

### Option 1: Docker Compose (Recommended - All in One)

**1. Clone the repository:**
```bash
git clone <repo-url>
cd AegisOps
```

**2. Create `.env` file** (see API Keys section above)

**3. Build and start all services:**
```bash
docker-compose up --build
```

**Services will be available at:**
- 🤖 **AegisOps Core API**: http://localhost:8001
- 🏗️ **Buggy App**: http://localhost:8000
- 🎨 **Dashboard**: http://localhost:8501

**View logs:**
```bash
docker-compose logs -f
```

**Stop services:**
```bash
docker-compose down
```

---

### Option 2: Local Development (Python Venv)

**Only if you want to run services locally without Docker**

#### A. Setup AEGIS CORE

```bash
cd aegis_core

# Create virtual environment
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY=your_key_here

# Run FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### B. Setup AEGIS INFRA

```bash
cd aegis_infra

python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run Flask app
python src/app.py  # Runs on localhost:8000
```

#### C. Setup DASHBOARD

```bash
cd aegis_dashboard  # or root if using root requirements.txt

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run Streamlit
streamlit run app.py
# Accessible at http://localhost:8501
```

**Note:** When running locally, update connection strings in code:
- Change `http://aegis-agent:8001` → `http://localhost:8001`
- Change `http://buggy-app-v2:8000` → `http://localhost:8000`

---

## Dependency Breakdown

### AEGIS CORE Dependencies
```
fastapi>=0.104.0              # Web framework
uvicorn>=0.24.0               # ASGI server
google-generativeai>=0.3.0    # Gemini API
openai>=1.0.0                 # Ollama/FastRouter (OpenAI-compatible)
docker>=7.0.0                 # Docker SDK
slack-sdk>=3.26.0             # Slack notifications
python-dotenv>=1.0.0          # .env file support
pydantic>=2.0.0               # Data validation
```

### AEGIS INFRA Dependencies
```
flask>=2.3.0                  # Web framework
psutil>=5.9.0                 # System monitoring
requests>=2.31.0              # HTTP client
opentelemetry-api>=1.20.0     # OTEL tracing
opentelemetry-distro>=0.41b0  # OTEL distribution
```

### DASHBOARD Dependencies
```
streamlit>=1.28.0             # UI framework
requests>=2.31.0              # HTTP calls
pandas>=2.0.0                 # Data processing
streamlit-autorefresh>=2.0.0  # Auto-refresh plugin
```

---

## Network Configuration

### Docker Compose Network
- **Network Name**: `aegis-network` (bridge)
- **Service Discovery**: Container-to-container via hostname
  - `aegis-agent:8001` (AegisOps Core)
  - `buggy-app-v2:8000` (Buggy App)
  - `aegis-dashboard:8501` (Dashboard)

### Port Mappings
| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Buggy App | 8000 | 8000 | Flask app & triggers |
| AegisOps Core | 8001 | 8001 | Webhook API |
| Dashboard | 8501 | 8501 | Streamlit UI |

### For Local Development
Replace container hostnames with `localhost`:
- `http://localhost:8000` - Buggy App
- `http://localhost:8001` - Core API
- `http://localhost:8501` - Dashboard

---

## Configuration Files

### 1. `.env` (Must Create!)
```env
# See API Keys section above for detailed setup
GEMINI_API_KEY=...
SLACK_BOT_TOKEN=...
```

### 2. `docker-compose.yml` (Pre-configured)
- Orchestrates all 3 services
- Sets environment variables
- Mounts data volumes
- Configures network

### 3. `aegis_core/app/config.py`
Contains configuration constants:
```python
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
LOG_TRUNCATE_CHARS = 2000  # Token safety limit
```

### 4. `aegis_infra/otel_config.yaml`
OpenTelemetry collector configuration (optional)

---

## Verification Checklist

After setup, verify everything is working:

- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker-compose --version`
- [ ] `.env` file created with API keys
- [ ] Services running: `docker-compose up --build`
- [ ] Core API responding: `curl http://localhost:8001/docs`
- [ ] Buggy App responding: `curl http://localhost:8000/health`
- [ ] Dashboard accessible: `http://localhost:8501` in browser
- [ ] Logs visible: `docker-compose logs -f`

---

## Troubleshooting Common Issues

### Issue: "Cannot connect to Docker daemon"
**Solution:**
- Ensure Docker Desktop is running
- On Linux, check: `sudo systemctl start docker`

### Issue: "Port 8001/8000/8501 already in use"
**Solution:**
```bash
# Find process using port
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Stop service or change port in docker-compose.yml
```

### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:**
```bash
# Ensure Docker image rebuilds
docker-compose build --no-cache
docker-compose up
```

### Issue: "GEMINI_API_KEY not found"
**Solution:**
- Create `.env` file in project root
- Restart containers: `docker-compose restart aegis-agent`

---

## Next Steps

1. ✅ Complete this prerequisites checklist
2. 📖 Read [overview.md](overview.md) for architecture details
3. 🚀 Start services: `docker-compose up --build`
4. 🧪 Test incident triggers (see API reference)
5. 🐛 Check logs for errors: `docker-compose logs -f`

---

## Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **FastAPI Guide**: https://fastapi.tiangolo.com/
- **Streamlit Docs**: https://docs.streamlit.io/
- **Gemini API**: https://ai.google.dev/
- **Slack API**: https://api.slack.com/
