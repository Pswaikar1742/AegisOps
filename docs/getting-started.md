# Getting Started — AegisOps GOD MODE v2.0

## Quick Start (5 Minutes)

### Prerequisites
- Docker Desktop (v20.10+) installed and running
- `FASTRTR_API_KEY` from FastRouter ([get one here](https://fastrouter.ai))

### 1. Clone and Configure

```bash
cd AegisOps

# Create the environment file
cp aegis_core/.env.example aegis_core/.env
```

Edit `aegis_core/.env` and set:
```env
FASTRTR_API_KEY=your_key_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/...   # optional
```

### 2. Start All Services

```bash
docker-compose up --build
```

Wait for all services to be healthy:
```
aegis-lb        | nginx started
buggy-app-v2    | Running on http://0.0.0.0:8000
aegis-agent     | 🛡️  AegisOps GOD MODE starting…
aegis-cockpit   | nginx started (serving React on :3000)
aegis-dashboard | You can now view your Streamlit app in your browser.
```

### 3. Access the Services

| Service | URL | Description |
|---------|-----|-------------|
| **SRE Cockpit** | http://localhost:3000 | Primary React UI with real-time WebSocket |
| **Core API Docs** | http://localhost:8001/docs | Interactive Swagger UI |
| **Buggy App** | http://localhost:8000/health | Target app health |
| **Load Balancer** | http://localhost:80/health | Nginx LB (proxies to buggy app) |
| **Legacy Dashboard** | http://localhost:8501 | Streamlit UI (backwards compat) |

### 4. Trigger Your First Incident

```bash
# Trigger a memory leak
curl http://localhost:8000/trigger_memory
```

**Watch in the SRE Cockpit (http://localhost:3000):**
1. 📨 Incident received — timeline panel appears
2. 📚 RAG retrieval — "Found N similar past incidents" (or cold start)
3. 🧠 AI stream — reasoning tokens appear typewriter-style
4. 🏛️ Council votes — three agents vote in sequence
5. ⚡ Action executed — container restarted / replicas spawned
6. 🩺 Health verified — `/health` passes
7. ✅ RESOLVED — runbook updated

---

## Detailed Setup

### Environment File

The environment file must be at `aegis_core/.env` (not the project root).

**All available settings:**
```env
# ── LLM Primary (required) ─────────────────────────────────────────
FASTRTR_API_KEY=your_key_here
FASTRTR_BASE_URL=https://go.fastrouter.ai/api/v1
FASTRTR_MODEL=anthropic/claude-sonnet-4-20250514

# ── LLM Fallback (optional, runs locally) ──────────────────────────
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:latest

# ── Slack Notifications (optional) ─────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# ── Tuning (all have safe defaults) ────────────────────────────────
LOG_TRUNCATE_CHARS=2000
VERIFY_RETRIES=3
VERIFY_DELAY_SECS=5
HEALTH_TIMEOUT_SECS=5
MAX_REPLICAS=5
METRICS_INTERVAL_SECS=3
```

### Without an API Key (Ollama-only mode)

If you don't have a FastRouter key, you can run in Ollama-only mode:

```bash
# Pull a model first (run once)
docker run --rm -v ollama:/root/.ollama ollama/ollama pull llama3.2

# In aegis_core/.env:
FASTRTR_API_KEY=          # leave empty
OLLAMA_BASE_URL=http://ollama:11434/v1
OLLAMA_MODEL=llama3.2:latest
```

Then start Ollama as a Docker service by adding to `docker-compose.yml`:
```yaml
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - aegis-network
    restart: unless-stopped
```

Note: Ollama on CPU is ~3–10× slower than FastRouter. For faster results, use a machine with a GPU.

---

## Testing Workflows

### Workflow A: Memory Leak (Automatic Detection)

```bash
# Terminal 1: Watch logs
docker-compose logs aegis-agent -f

# Terminal 2: Gradually increase memory pressure
curl http://localhost:8000/trigger_memory
sleep 2
curl http://localhost:8000/trigger_memory
sleep 2
curl http://localhost:8000/trigger_memory
# Repeat until daemon detects > 85% memory and fires the webhook
```

**Expected sequence:**
1. Background daemon detects `psutil.virtual_memory().percent > 85`
2. Daemon sends webhook: `POST http://aegis-agent:8001/webhook`
3. AegisOps logs: `📨 Webhook: <id> (Memory Leak)`
4. RAG retrieves (or cold starts)
5. AI analyses → recommends RESTART
6. Council: 3/3 APPROVED
7. Container restarts
8. Health check passes
9. `✅ GOD MODE: Incident <id> RESOLVED`

---

### Workflow B: Manual Webhook (Direct API)

```bash
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "manual-001",
    "alert_type": "Memory Leak",
    "severity": "CRITICAL",
    "logs": "ERROR: Memory usage at 98%. Heap growing unbounded. OOM imminent.",
    "container_name": "buggy-app-v2"
  }'
```

Poll for status:
```bash
# Poll every 2 seconds for up to 30 seconds
for i in {1..15}; do
  STATUS=$(curl -s http://localhost:8001/incidents/manual-001 | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "Status: $STATUS"
  [ "$STATUS" = "RESOLVED" ] || [ "$STATUS" = "FAILED" ] && break
  sleep 2
done
```

---

### Workflow C: CPU Spike

```bash
curl http://localhost:8000/trigger_cpu
```

**Expected:** AI recommends `SCALE_UP` (CPU spikes → more replicas to distribute load).  
Watch topology panel in Cockpit — new replica nodes should appear after council approval.

---

### Workflow D: Manual Scaling

```bash
# Scale up to 2 replicas
curl -X POST "http://localhost:8001/scale/up?count=2"

# View topology
curl http://localhost:8001/topology | python3 -m json.tool

# Check Nginx is updated
docker exec aegis-lb cat /etc/nginx/conf.d/upstream.conf

# Scale back down
curl -X POST http://localhost:8001/scale/down
```

---

### Workflow E: RAG Knowledge Base

After at least one incident has been resolved:

```bash
# View the runbook (RAG corpus)
curl http://localhost:8001/runbook | python3 -m json.tool

# Test retrieval with similar logs
curl "http://localhost:8001/rag/test?logs=memory+usage+growing+heap+leak"
```

---

### Workflow F: WebSocket Stream (CLI)

```bash
# Install websocat (brew install websocat / apt install websocat)
websocat ws://localhost:8001/ws

# Type: ping
# Server responds: {"type": "heartbeat", "data": {"status": "alive"}, ...}

# Then trigger an incident in another terminal and watch all frames arrive
```

---

## API Reference Quick Commands

```bash
# Health
curl http://localhost:8001/health

# Send incident
curl -X POST http://localhost:8001/webhook -H "Content-Type: application/json" -d '{...}'

# List all incidents
curl http://localhost:8001/incidents

# Get specific incident
curl http://localhost:8001/incidents/{incident_id}

# Live metrics
curl http://localhost:8001/metrics | python3 -m json.tool

# List containers
curl http://localhost:8001/containers

# Service topology
curl http://localhost:8001/topology | python3 -m json.tool

# Runbook (RAG corpus)
curl http://localhost:8001/runbook | python3 -m json.tool

# Test RAG retrieval
curl "http://localhost:8001/rag/test?logs=cpu+spike+infinite+loop"

# Manual scale up (3 replicas)
curl -X POST "http://localhost:8001/scale/up?count=3"

# Manual scale down
curl -X POST http://localhost:8001/scale/down
```

---

## Log Monitoring

```bash
# All services
docker-compose logs -f

# Just AegisOps Core (most informative)
docker-compose logs aegis-agent -f

# Just the buggy app
docker-compose logs buggy-app-v2 -f

# Follow with filter
docker-compose logs aegis-agent -f | grep -E "RESOLVED|FAILED|Council|RAG"

# Last 50 lines + follow
docker-compose logs aegis-agent -f --tail=50
```

### What to look for in logs

```
📨 Webhook: <id>           → Incident received
📚 RAG: Found N similar    → RAG retrieved entries
📚 RAG: Cold start         → Runbook empty, first incident
🧠 SRE Agent → action=X    → AI diagnosis complete
🏛️ Council: APPROVED (3/3) → Council decision
⚡ Scaling UP: spawning N  → Scale-up starting
🔄 Restarting container    → Restart action
💚 Health PASSED            → Verification success
✅ GOD MODE: Incident RESOLVED
❌ GOD MODE: Incident FAILED
📒 Runbook updated - N entries  → Learning happened
```

---

## Running Without Docker (Advanced)

### AEGIS CORE

```bash
cd aegis_core
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit .env with your keys

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### AEGIS INFRA (Buggy App)

```bash
cd aegis_infra
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python src/app.py  # Runs on port 8000
```

When running locally, update the health check URL in `aegis_core/app/config.py`:
```python
HEALTH_URL = "http://localhost:8000/health"
```

### AEGIS COCKPIT (React UI)

```bash
cd aegis_cockpit
npm install
npm run dev  # Runs on port 5173 (Vite dev server)
```

Update the WebSocket URL in the Dashboard component to point to `ws://localhost:8001/ws`.

---

## Common Commands

```bash
# Build and start everything
docker-compose up --build

# Start without rebuild (use cached images)
docker-compose up

# Stop all services
docker-compose down

# Stop and remove volumes (clears runbook.json data)
docker-compose down -v

# Rebuild a single service
docker-compose build aegis-agent
docker-compose up --no-deps aegis-agent

# Restart one service
docker-compose restart aegis-agent

# Shell into a container
docker exec -it aegis-agent bash
docker exec -it buggy-app-v2 bash

# View runbook data
docker exec aegis-agent cat /app/data/runbook.json | python3 -m json.tool

# Clear runbook (reset learning)
docker exec aegis-agent sh -c 'echo "[]" > /app/data/runbook.json'
```

---

## Debugging Guide

### Issue: No incident fires automatically

**Check:** Is the memory threshold being hit?
```bash
docker exec buggy-app-v2 python3 -c "import psutil; print(psutil.virtual_memory().percent)"
```
If < 85%, call `/trigger_memory` more times. You can also send a manual webhook directly.

### Issue: "FASTRTR_API_KEY not set" in logs

**Fix:** Ensure `aegis_core/.env` exists and has the key:
```bash
cat aegis_core/.env | grep FASTRTR_API_KEY
```

### Issue: LLM returns malformed JSON

**Symptom:** `ai_brain.py` logs `Failed to parse JSON`  
**Fix:** Usually self-correcting on retry. If persistent, check `OLLAMA_MODEL` is downloaded.

### Issue: Scaling fails ("Source container not found")

**Cause:** Target container `buggy-app-v2` is not running.
```bash
docker-compose ps buggy-app-v2
docker-compose up buggy-app-v2
```

### Issue: Health check fails after restart

**Cause:** Container takes longer than `VERIFY_DELAY_SECS × VERIFY_RETRIES` to come up.
```bash
# Increase retries in aegis_core/.env:
VERIFY_RETRIES=5
VERIFY_DELAY_SECS=8
```

### Issue: Cockpit shows blank page

**Cause:** React build not complete, or Nginx on port 3000 not started.
```bash
docker-compose logs aegis-cockpit
# If failed to build, try:
docker-compose build --no-cache aegis-cockpit
```

### Issue: WebSocket disconnects immediately

**Cause:** Cockpit is connecting to wrong host. In Docker, the cockpit container should use `ws://aegis-agent:8001/ws`. For local dev, use `ws://localhost:8001/ws`.

### Issue: Port already in use

```bash
# Find what's using the port
lsof -i :8001   # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Or change ports in docker-compose.yml
```

---

## Troubleshooting Reference Table

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No automatic incidents | Memory < 85% | Trigger more `/trigger_memory` calls |
| `FASTRTR_API_KEY not set` | Missing .env | Create `aegis_core/.env` with key |
| LLM parse error | Malformed JSON response | Usually self-heals; check Ollama model |
| Council always rejects | Dangerous action proposed | Check AI output; adjust system prompt |
| Scale-up spawns 0 replicas | Docker API error / no source container | Check `docker-compose logs aegis-agent` |
| Nginx not reconfiguring | `aegis-lb` container missing | Ensure `docker-compose up aegis-lb` |
| Cockpit blank page | Build failed / wrong WS URL | Rebuild cockpit; check browser console |
| No Slack messages | `SLACK_WEBHOOK_URL` not set | Add to `aegis_core/.env` |
| Runbook not growing | Incidents failing (not resolved) | Fix upstream issue first |
| Metrics charts empty | WebSocket not connected | Reload Cockpit; check WS connection |

---

## Next Steps

1. ✅ Verify all services running: `docker-compose ps`
2. 🧪 Try all 6 workflows above
3. 📖 Read [architecture.md](architecture.md) for deep technical details
4. 🔌 Read [api-reference.md](api-reference.md) for all endpoint details
5. 🧠 Read [llm-strategy.md](llm-strategy.md) for AI/RAG details
6. 📚 Watch the runbook grow: `curl http://localhost:8001/runbook`
7. 🚀 Customise: add new trigger endpoints, tweak LLM prompts, add new action types
