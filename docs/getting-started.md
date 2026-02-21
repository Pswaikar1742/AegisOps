# Getting Started & Quick Start Guide

## 5-Minute Quick Start

### Prerequisites
- Docker Desktop installed and running
- `.env` file with API keys (see Prerequisites)

### Step 1: Clone & Setup (1 min)

```bash
cd AegisOps
cp .env.example .env  # or create .env with your keys
```

**Required in `.env`:**
```env
GEMINI_API_KEY=your_key_here
SLACK_BOT_TOKEN=xoxb-your-token  # optional but recommended
```

### Step 2: Start All Services (2 min)

```bash
docker-compose up --build
```

**Wait for output:**
```
aegis-agent    | ✅ AegisOps Agent Core starting…
buggy-app-v2   | Running on http://0.0.0.0:8000
aegis-dashboard| You can now view your Streamlit app in your browser.
```

### Step 3: Access Services (1 min)

- 🎨 **Dashboard**: http://localhost:8501
- 🤖 **API Docs**: http://localhost:8001/docs
- 🏗️ **Buggy App**: http://localhost:8000/health

### Step 4: Trigger an Incident (1 min)

```bash
# Terminal 2 - while services are running
curl http://localhost:8000/trigger_memory
curl http://localhost:8000/trigger_memory  # Call again to increase pressure
```

**Watch:**
1. Memory increases
2. AegisOps detects threshold breach
3. Sends webhook to Core API
4. AI analyzes and recommends RESTART
5. Container restarts
6. Health verified
7. Dashboard shows RESOLVED status

---

## Detailed Getting Started

### Understanding the 3 Services

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **Dashboard** | 8501 | Real-time UI | 🎨 Browse & visualize |
| **AegisOps Core** | 8001 | Brain (AI + Orchestration) | 🧠 Receives incidents |
| **Buggy App** | 8000 | Target / Victim | 🏗️ Simulates issues |

### Checking Service Health

```bash
# Check all are running
docker-compose ps

# Check logs for errors
docker-compose logs -f

# Check specific service
docker-compose logs aegis-agent -f
docker-compose logs buggy-app-v2 -f
docker-compose logs aegis-dashboard -f
```

---

## Testing Workflows

### Workflow A: Memory Leak Simulation

**Objective:** Simulate a memory leak and watch AegisOps fix it

```bash
# Terminal 1: Watch logs
docker-compose logs aegis-agent -f

# Terminal 2: Trigger incident
curl http://localhost:8000/trigger_memory
sleep 1
curl http://localhost:8000/trigger_memory  # Repeat to increase pressure
sleep 1
curl http://localhost:8000/trigger_memory
```

**What You'll See:**
1. Logs show memory growing
2. Memory monitor daemon detects >85%
3. Webhook sent to AegisOps Core
4. AI Brain analyzes: "Memory leak → RESTART"
5. Docker restarts container
6. Health check passes
7. Incident marked RESOLVED
8. Runbook updated
9. Slack notification (if configured)

**Terminal 3 (optional): Check Dashboard**
```bash
open http://localhost:8501
```

---

### Workflow B: CPU Spike Simulation

```bash
# Terminal 1: Logs
docker-compose logs aegis-agent -f

# Terminal 2: Trigger
curl http://localhost:8000/trigger_cpu
```

**Expected Behavior:**
- Similar to memory leak
- AI recognizes CPU spike pattern
- Recommends RESTART or SCALE_UP
- Container restarts
- CPU usage returns to normal

---

### Workflow C: Database Latency

```bash
# Terminal 1: Logs
docker-compose logs aegis-agent -f

# Terminal 2: Trigger
curl http://localhost:8000/trigger_db_latency
```

**Expected:**
- 5-second sleep simulates slow query
- API hangs
- AegisOps may trigger after repeated failures
- Restart clears the state

---

## API Testing

### Test 1: Direct Webhook Call

```bash
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "test-001",
    "container_name": "buggy-app-v2",
    "alert_type": "Memory Leak",
    "severity": "CRITICAL",
    "logs": "ERROR: Memory usage at 98%",
    "timestamp": "2024-02-21T03:15:00Z"
  }'
```

**Response (immediate):**
```json
{
  "incident_id": "test-001",
  "container_name": "buggy-app-v2",
  "status": "RECEIVED",
  "analysis": null,
  "error": null
}
```

**Then (after 3-5 seconds):**
```bash
curl http://localhost:8001/incidents/test-001
```

**Response:**
```json
{
  "incident_id": "test-001",
  "status": "RESOLVED",
  "analysis": {
    "root_cause": "Memory leak",
    "action": "RESTART",
    "justification": "Container restart will release memory"
  }
}
```

---

### Test 2: List All Incidents

```bash
curl http://localhost:8001/incidents
```

---

### Test 3: Swagger UI Exploration

Open http://localhost:8001/docs in browser and click "Try it out" on endpoints

---

## Dashboard Exploration

### Sections

1. **Top Metrics**
   - Global CPU Usage
   - Global Memory Usage
   - System Health Status

2. **Incident Lifecycle**
   - Stages: Nominal → Anomaly → AI Brain → Action → Verification
   - Auto-progresses every 2-5 seconds
   - Displays raw incident JSON

3. **Sidebar - Runbook**
   - Shows learned solutions
   - Issues and fixes
   - Timestamps

4. **Sidebar - Business Impact**
   - Total money saved today
   - Simulated cost calculations

5. **Dev Controls**
   - "Simulate Incident Lifecycle" button
   - Resets incident simulation

---

## Local Development Setup

### Running Without Docker (Advanced)

#### Setup Core API Locally

```bash
cd aegis_core

# Create venv
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Set env vars
export GEMINI_API_KEY=your_key
export SLACK_BOT_TOKEN=xoxb-your-token

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Then start other services in Docker:**
```bash
# In docker-compose.yml, remove aegis-agent service
# Keep buggy-app-v2 and aegis-dashboard
docker-compose up buggy-app-v2 aegis-dashboard
```

#### Setup Buggy App Locally

```bash
cd aegis_infra

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

python src/app.py  # Runs on localhost:8000
```

**Update AegisOps Core to use localhost:**
```python
# In aegis_core/app/docker_ops.py
HEALTH_CHECK_URL = "http://localhost:8000/health"  # Not container name
```

---

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs aegis-agent -f
docker-compose logs buggy-app-v2 -f
docker-compose logs aegis-dashboard -f

# Last N lines
docker-compose logs -f --tail=50
```

### Restart Services

```bash
# Restart one service
docker-compose restart aegis-agent

# Restart all
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up --build
```

### Clean Up

```bash
# Stop services
docker-compose down

# Remove volumes (data)
docker-compose down -v

# Remove images
docker rmi aegisops:latest ollama:latest
```

### Shell into Container

```bash
# AegisOps Core
docker exec -it aegis-agent bash

# Buggy App
docker exec -it buggy-app-v2 bash

# Check files
docker exec aegis-agent ls -la /app/data
```

---

## Debugging

### Issue: Webhook sent but nothing happens

**Debug:**
```bash
# Check logs
docker-compose logs aegis-agent -f | grep -i error

# Check API is responding
curl http://localhost:8001/docs

# Try direct webhook call (see API section)
```

### Issue: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Ensure Docker Desktop running
open /Applications/Docker.app  # macOS
# or docker daemon running on Linux
sudo systemctl start docker
```

### Issue: Port already in use

**Solution:**
```bash
# Find what's using port 8001
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Either kill that process or change ports in docker-compose.yml
```

### Issue: Container keeps restarting

**Diagnosis:**
```bash
docker-compose logs aegis-agent -f
# Look for repeated restart errors
```

**Common causes:**
- Missing `.env` file
- Invalid API key
- Port conflict
- Out of memory

---

## Next Steps

1. ✅ Verify all services running
2. 📖 Read [overview.md](overview.md) for architecture
3. 🧪 Try all 3 workflows above
4. 🔧 Customize incident triggers in `aegis_infra/src/app.py`
5. 🧠 Add new LLM provider (see [llm-strategy.md](llm-strategy.md))
6. 📚 Explore runbook growth in `data/runbook.json`

---

## Getting Help

### Check Logs First

```bash
docker-compose logs -f 2>&1 | grep -i "error\|exception\|failed"
```

### Read Documentation

- [overview.md](overview.md) - Architecture & components
- [architecture.md](architecture.md) - Deep technical dive
- [api-reference.md](api-reference.md) - API endpoints
- [llm-strategy.md](llm-strategy.md) - AI engine details
- [prerequisites.md](prerequisites.md) - Setup & dependencies

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| 404 on API | Services not all running (`docker-compose up`) |
| AI analysis fails | Check GEMINI_API_KEY in `.env` |
| Health check fails | Buggy app not responding (check logs) |
| Dashboard shows no data | API not responding (check port 8001) |
| Memory keeps growing | Expected if you keep triggering (restart app) |

---

## Tips & Tricks

### Simulate Multiple Incidents Fast

```bash
for i in {1..5}; do
  curl http://localhost:8000/trigger_memory &
done
wait
```

### Monitor in Real-Time

**Terminal 1:**
```bash
watch -n 1 'docker-compose ps'  # Updates every 1 sec
```

**Terminal 2:**
```bash
docker-compose logs -f --tail=10
```

**Terminal 3:**
```bash
open http://localhost:8501  # Dashboard
```

### Extract Runbook Data

```bash
docker exec aegis-agent cat /app/data/runbook.json | jq
```

### Save API Responses

```bash
curl http://localhost:8001/incidents > incidents_dump.json
cat incidents_dump.json | jq  # Pretty print
```

---

## Customization Examples

### Add Custom Health Endpoint

**In `aegis_infra/src/app.py`:**
```python
@app.route('/custom_health', methods=['GET'])
def custom_health():
    return {"status": "healthy", "db": "connected", "cache": "warm"}
```

**In `aegis_core/app/verification.py`:**
```python
async def verify_health():
    response = requests.get(
        "http://buggy-app-v2:8000/custom_health",
        timeout=5
    )
    return response.json()['db'] == "connected"
```

### Add New Trigger Type

**In `aegis_infra/src/app.py`:**
```python
@app.route('/trigger_disk_full', methods=['GET'])
def trigger_disk_full():
    # Simulate full disk
    # Write lots of files, etc.
    return {"message": "Disk trigger activated"}
```

### Change Verification Retry Logic

**In `aegis_core/app/verification.py`:**
```python
async def verify_health(max_attempts=10):  # Increase retries
    # ...
```

---

## Performance Tips

### Speed Up Dashboard

```bash
# Reduce refresh interval in app.py
streamlit run app.py --client.toolbarMode=minimal
```

### Reduce Memory Usage

```bash
# Use smaller Ollama model
export OLLAMA_MODEL=orca-mini  # vs mistral
```

### Optimize LLM Calls

```python
# Cache LLM responses
from functools import lru_cache

@lru_cache(maxsize=100)
async def analyze_logs(payload):
    # ...
```

---

## What To Try Next

1. **Modify LLM System Prompt** - Make AI smarter
2. **Add New Action Type** - Implement SCALE_UP
3. **Build Custom Dashboard** - Use Grafana instead of Streamlit
4. **Add Database** - Persist incidents instead of in-memory
5. **Deploy to Kubernetes** - Scale to production
6. **Fine-Tune Model** - Based on your incident patterns
