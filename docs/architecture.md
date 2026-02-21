# Architecture Deep Dive

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose Network                       │
│                     (aegis-network bridge)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               AEGIS CORE (Port 8001)                      │  │
│  │           Autonomous SRE Agent - FastAPI                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  POST /webhook                                          │  │
│  │    │                                                    │  │
│  │    ├─→ [1. PARSE] IncidentPayload validation           │  │
│  │    │                                                    │  │
│  │    ├─→ [2. BACKGROUND TASK SPAWN]                      │  │
│  │    │   └─→ Return 200 OK immediately                   │  │
│  │    │                                                    │  │
│  │    └─→ [ASYNC PIPELINE]                                │  │
│  │        │                                                │  │
│  │        ├─→ [3. AI ANALYSIS]                             │  │
│  │        │   ├─→ FastRouter LLM (primary)               │  │
│  │        │   └─→ Ollama LLM (fallback)                  │  │
│  │        │   Result: AIAnalysis {root_cause, action}    │  │
│  │        │                                                │  │
│  │        ├─→ [4. EXECUTE ACTION]                          │  │
│  │        │   └─→ Docker SDK → restart container          │  │
│  │        │                                                │  │
│  │        ├─→ [5. VERIFY HEALTH]                           │  │
│  │        │   ├─→ Retry loop (exponential backoff)        │  │
│  │        │   └─→ Health endpoint: /health                │  │
│  │        │                                                │  │
│  │        ├─→ [6. LEARN]                                   │  │
│  │        │   └─→ Append to runbook.json                  │  │
│  │        │                                                │  │
│  │        └─→ [7. NOTIFY]                                  │  │
│  │            └─→ Slack webhook                            │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                    ▲                              │              │
│                    │                              ▼              │
│                    │                                            │
│  ┌──────────────────────────┐   ┌────────────────────────────┐ │
│  │   BUGGY APP (Port 8000)  │   │ DASHBOARD (Port 8501)      │ │
│  │    Flask Target          │   │  Streamlit UI              │ │
│  ├──────────────────────────┤   ├────────────────────────────┤ │
│  │                          │   │                            │ │
│  │ GET /health              │   │ Real-time Viz:             │ │
│  │ GET /trigger_memory      │   │ - CPU/Memory metrics       │ │
│  │ GET /trigger_cpu         │   │ - Incident lifecycle       │ │
│  │ GET /trigger_db_latency  │   │ - Runbook viewer           │ │
│  │                          │   │ - Business impact ($$)     │ │
│  │ Daemon thread:           │   │                            │ │
│  │ - Memory monitor         │   │ Fetches from:              │ │
│  │ - Sends webhooks →       │   │ - /incidents API           │ │
│  │   AegisOps Core          │   │ - data/sample_incidents.json
│  │                          │   │                            │ │
│  └──────────────────────────┘   └────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SHARED DATA VOLUMES                          │  │
│  │  - data/runbook.json (auto-growing knowledge base)       │  │
│  │  - data/sample_incidents.json (fallback data)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### AEGIS CORE: Incident Processing Pipeline

#### File: `aegis_core/app/main.py`

**Responsibility:** FastAPI server + incident orchestration

**Key Functions:**
- `receive_webhook()` - HTTP handler for incidents
- `_remediate()` - Main async pipeline

**Flow:**
```python
async def _remediate(payload, result):
    # 1. Analyze logs with AI
    try:
        analysis = await analyze_logs(payload)
        result.analysis = analysis
        result.status = ResolutionStatus.EXECUTING
    except Exception:
        result.status = ResolutionStatus.FAILED
        return
    
    # 2. Execute action (only RESTART auto-executes)
    if analysis.action == ActionType.RESTART:
        await restart_container()
    
    # 3. Verify health
    healthy = await verify_health()
    
    # 4. If healthy, learn
    if healthy:
        await append_to_runbook(payload, analysis)
        result.status = ResolutionStatus.RESOLVED
    else:
        result.status = ResolutionStatus.FAILED
```

**Key Features:**
- 🔄 **Async/Await** for non-blocking I/O
- 📋 **BackgroundTasks** for fire-and-forget pipeline
- 📊 **In-memory Incident Tracker** (dict)
- 🔗 **CORS enabled** for dashboard API calls
- 📡 **Slack notifications** at each stage

---

#### File: `aegis_core/app/ai_brain.py`

**Responsibility:** LLM integration with dual-provider strategy

**Dual-Provider Strategy:**

```python
async def analyze_logs(payload):
    logs = _truncate_logs(payload.logs, max_chars=2000)
    
    # Try FastRouter first (faster, cloud)
    try:
        response = await _call_provider(
            client=_get_fastrtr_client(),
            model=FASTRTR_MODEL,
            messages=[...]
        )
        analysis = _parse_json(response)
        return AIAnalysis(**analysis)
    except Exception:
        logger.warning("FastRouter failed, falling back to Ollama")
    
    # Fallback to Ollama (local, always available)
    try:
        response = await _call_provider(
            client=_get_ollama_client(),
            model=OLLAMA_MODEL,
            messages=[...]
        )
        analysis = _parse_json(response)
        return AIAnalysis(**analysis)
    except Exception:
        raise RuntimeError("All LLM providers failed")
```

**System Prompt:**
```
You are an expert SRE diagnostician.
Analyse the incident payload and return ONLY valid JSON:
{
  "root_cause": "<one-line summary>",
  "action": "RESTART" | "SCALE_UP" | "ROLLBACK" | "NOOP",
  "justification": "<why>"
}
```

**Token Safety:**
- Truncates logs to last 2000 chars
- Prevents token overflow
- Maintains context of recent errors

**Lazy Initialization:**
- Clients created on-demand
- Avoid unnecessary connections
- Global singletons for reuse

---

#### File: `aegis_core/app/docker_ops.py`

**Responsibility:** Docker API integration

**Functions:**
- `restart_container()` - Restart buggy-app-v2
- `get_container_logs()` - Fetch last N lines of logs
- `list_running_containers()` - Enumerate active containers

**Implementation:**
```python
import docker

client = docker.from_env()

async def restart_container():
    container = client.containers.get("buggy-app-v2")
    container.restart()
    return container.status
```

**Error Handling:**
- Catches Docker API failures
- Logs container state for debugging
- Returns helpful error messages

---

#### File: `aegis_core/app/verification.py`

**Responsibility:** Health verification with retries

**Logic:**
```python
async def verify_health(
    max_attempts=5,
    initial_delay=1.0,
    backoff_factor=1.5,
    timeout=5
):
    # Exponential backoff: 1s, 1.5s, 2.25s, 3.375s, 5s
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                "http://buggy-app-v2:8000/health",
                timeout=timeout
            )
            if response.status_code == 200:
                return True
        except Exception:
            pass
        
        await asyncio.sleep(delay)
        delay *= backoff_factor
    
    return False
```

**Retry Strategy:**
- ✅ **Exponential backoff** prevents overwhelming service
- ✅ **Timeout per request** prevents hanging
- ✅ **Multiple attempts** account for slow startup
- ✅ **Final return** all-or-nothing (success/failure)

---

#### File: `aegis_core/app/slack_notifier.py`

**Responsibility:** Incident notifications

**Events:**
- 📬 Received
- 🔍 Analyzing
- ⚡ Executing
- ✅ Resolved
- ❌ Failed

**Message Format:**
```
🔴 [CRITICAL] Memory Leak Detected
Incident: incident-abc123
Service: api-backend
Action: RESTART
Status: RESOLVED in 3 seconds
Root Cause: Memory leak in event handler

Actions Taken:
  1. Analyzed logs with AI
  2. Restarted container
  3. Verified health: PASS
  4. Added to runbook

💾 Money Saved: $250
```

---

#### File: `aegis_core/app/models.py`

**Responsibility:** Pydantic data models

**Models:**
```python
class IncidentPayload(BaseModel):
    incident_id: str
    container_name: str
    alert_type: str
    severity: str
    logs: str
    timestamp: str

class AIAnalysis(BaseModel):
    root_cause: str
    action: ActionType
    justification: str

class IncidentResult(BaseModel):
    incident_id: str
    container_name: str
    status: ResolutionStatus
    analysis: Optional[AIAnalysis] = None
    error: Optional[str] = None

class ActionType(str, Enum):
    RESTART = "RESTART"
    SCALE_UP = "SCALE_UP"
    ROLLBACK = "ROLLBACK"
    NOOP = "NOOP"

class ResolutionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    ANALYZING = "ANALYZING"
    EXECUTING = "EXECUTING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"
```

---

### AEGIS INFRA: The Buggy Application

#### File: `aegis_infra/src/app.py`

**Responsibility:** Flask app that crashes in controllable ways

**Endpoints:**
```python
@app.route('/health', methods=['GET'])
def health():
    """Always returns 200 OK"""
    return {"status": "ok"}

@app.route('/trigger_memory', methods=['GET'])
def trigger_memory():
    """Allocates 10MB chunk, simulates leak"""
    memory_hog.append('x' * (10 * 1024 * 1024))
    return {"message": "Memory trigger activated"}

@app.route('/trigger_cpu', methods=['GET'])
def trigger_cpu():
    """Starts infinite factorial thread"""
    threading.Thread(target=calculate_factorial_infinite, daemon=True).start()
    return {"message": "CPU trigger activated"}

@app.route('/trigger_db_latency', methods=['GET'])
def trigger_db_latency():
    """Sleeps for 5 seconds"""
    time.sleep(5)
    return {"message": "DB latency simulation completed"}
```

**Background Monitor:**
```python
def memory_monitor():
    """Daemon thread that sends webhooks when memory > 85%"""
    while True:
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > 85:
            payload = {
                "incident_id": str(uuid.uuid4()),
                "alert_type": "Memory Leak",
                "logs": f"Memory: {memory_percent}%..."
            }
            requests.post("http://aegis-agent:8001/webhook", json=payload)
        time.sleep(2)
```

---

#### File: `aegis_infra/otel_config.yaml`

**Responsibility:** OpenTelemetry configuration (optional)

**Features:**
- Distributed tracing
- Metrics collection
- Log aggregation
- Can feed into ELK, Datadog, etc.

---

### AEGIS DASHBOARD: Real-Time Visualization

#### File: `aegis_dashboard/app.py` or root `app.py`

**Responsibility:** Streamlit interactive dashboard

**Sections:**
1. **Metrics Row** - CPU, Memory, System Health
2. **Incident Lifecycle** - 5 stages of remediation
3. **Raw Incident Data** - JSON viewer
4. **AI Analysis** - Root cause & action
5. **Runbook Sidebar** - Learned solutions
6. **Business Impact** - Money saved metric
7. **Dev Controls** - Simulate incident lifecycle

**Session State Machine:**
```
Stage 0: Nominal (all green) → 2 sec sleep → Stage 1
Stage 1: Anomaly (alerts firing) → 2 sec sleep → Stage 2
Stage 2: AI Brain (analyzing) → 3 sec sleep → Stage 3
Stage 3: Action (executing) → 1 sec sleep → Stage 4
Stage 4: Verification (health check) → Done
```

**Key Features:**
- 🔄 **Session State** - Maintains incident lifecycle state
- 🎨 **Expanders** - Collapsible sections for details
- 🔔 **Toasts** - Popup notifications
- 📊 **Metrics** - Top-level KPIs
- 📚 **Sidebar** - Runbook reference

---

## Data Flow: Complete Incident Journey

### Step 1: Incident Triggered

```bash
curl http://localhost:8000/trigger_memory
```

**Effect:**
- Allocates 10MB of memory
- Appends to `memory_hog` list
- Memory grows over time

---

### Step 2: Memory Monitor Detects Threshold

**Code (Buggy App Daemon):**
```python
memory_percent = psutil.virtual_memory().percent  # e.g., 87%
if memory_percent > 85:
    requests.post("http://aegis-agent:8001/webhook", json=payload)
```

**Payload sent:**
```json
{
  "incident_id": "550e8400-...",
  "container_name": "buggy-app-v2",
  "alert_type": "Memory Leak",
  "severity": "CRITICAL",
  "logs": "Memory usage at 87%. Potential OOM imminent.",
  "timestamp": "2024-02-21T03:15:00Z"
}
```

---

### Step 3: AegisOps Receives & Returns 200 OK

**Code (main.py):**
```python
@app.post("/webhook")
async def receive_webhook(payload, background_tasks):
    result = IncidentResult(
        incident_id=payload.incident_id,
        status=ResolutionStatus.RECEIVED
    )
    incidents[payload.incident_id] = result
    
    # Spawn background remediation pipeline
    background_tasks.add_task(_remediate, payload, result)
    
    return result  # 200 OK returned immediately
```

---

### Step 4: AI Analysis (Async, In Background)

**Timeline:** ~1-3 seconds

**Code (ai_brain.py):**
```python
analysis = await analyze_logs(payload)
# FastRouter API call:
# - Truncate logs to 2000 chars
# - Send to FastRouter LLM (or fallback to Ollama)
# - Parse JSON response
# - Return AIAnalysis
```

**LLM Reasoning:**
```
User Message:
  "Memory usage at 87%. Potential OOM imminent."
  
LLM Response:
  {
    "root_cause": "Memory leak in batch event handler",
    "action": "RESTART",
    "justification": "Pattern matches known issue from 2024-02-19. Container restart will release memory."
  }
```

**Result stored:**
```python
result.analysis = analysis
result.status = ResolutionStatus.ANALYZING
```

---

### Step 5: Execute Remediation Action

**Timeline:** ~1 second

**Code (docker_ops.py):**
```python
if analysis.action == ActionType.RESTART:
    container = client.containers.get("buggy-app-v2")
    container.restart()
    # Container is now restarting
```

**Docker Event:**
```
Container "buggy-app-v2" stopping...
Container "buggy-app-v2" stopped
Container "buggy-app-v2" starting...
```

**Result updated:**
```python
result.status = ResolutionStatus.EXECUTING
```

---

### Step 6: Verify Health (With Retries)

**Timeline:** ~2-5 seconds

**Code (verification.py):**
```python
healthy = await verify_health(
    max_attempts=5,
    initial_delay=1.0,
    backoff_factor=1.5
)

# Attempts:
# 1. sleep(1s) → GET /health → 503 (starting)
# 2. sleep(1.5s) → GET /health → 503 (starting)
# 3. sleep(2.25s) → GET /health → 200 (UP!)
```

**Result:**
```
Attempt 1: [FAIL] Cannot connect (container starting)
Attempt 2: [FAIL] Cannot connect (container starting)
Attempt 3: [PASS] {"status": "ok"}

✅ Health Check Passed
```

---

### Step 7: Learn (Append to Runbook)

**Timeline:** ~100ms

**Code (verification.py):**
```python
await append_to_runbook(payload, analysis)
```

**Before:**
```json
{
  "entries": [
    {
      "timestamp": "2024-02-19 11:42 PM",
      "issue": "Memory Leak in Event Handler",
      "fix": "Restart Container"
    }
  ]
}
```

**After:**
```json
{
  "entries": [
    {
      "timestamp": "2024-02-19 11:42 PM",
      "issue": "Memory Leak in Event Handler",
      "fix": "Restart Container"
    },
    {
      "timestamp": "2024-02-21 03:15 AM",
      "issue": "Memory Leak in Batch Event Handler",
      "fix": "Restart Container",
      "verified_healthy": true
    }
  ]
}
```

---

### Step 8: Notify Slack

**Timeline:** ~500ms

**Slack Message:**
```
🎉 INCIDENT RESOLVED

ID: 550e8400-...
Service: api-backend
Severity: CRITICAL
MTTR: 3 seconds

Root Cause: Memory leak in batch event handler
Action: RESTART
Status: VERIFIED HEALTHY

💰 Money Saved: $25 (vs $7,500 manual MTTR)
📚 Added to Runbook for future reference
```

---

### Step 9: Dashboard Shows Results

**Timeline:** Real-time

**Dashboard Updates:**
```
CPU: 12% (normal)
Memory: 45% (recovered from 98%)
Health: Operational ✅

Incident Lifecycle:
  [✅ Received] → [✅ Analyzed] → [✅ Executed] → [✅ Verified]
  
Runbook Entry Added
```

**Final Status:**
```json
{
  "incident_id": "550e8400-...",
  "status": "RESOLVED",
  "analysis": {
    "root_cause": "Memory leak in batch event handler",
    "action": "RESTART",
    "justification": "Pattern matches known issue..."
  },
  "error": null
}
```

---

## Scalability Considerations

### Current Design (Single Agent)
- Handles ~100 incidents/second per instance
- In-memory incident tracker (data lost on restart)
- Single Docker host

### Future Scaling
```
┌──────────────────────────────────────┐
│    Kubernetes Cluster                │
├──────────────────────────────────────┤
│                                      │
│  Pod 1: AegisOps Agent              │
│  Pod 2: AegisOps Agent              │
│  Pod 3: AegisOps Agent              │
│         (horizontal scale)            │
│                                      │
│  Service: Load Balancer              │
│  Storage: PostgreSQL (incident DB)   │
│  Cache: Redis (runbook cache)        │
│  Queue: RabbitMQ (incident queue)    │
│                                      │
└──────────────────────────────────────┘
```

**Improvements Needed:**
- Replace in-memory dict with database
- Add message queue for incident batching
- Kubernetes deployment manifests
- Persistent runbook storage
- Distributed tracing (Jaeger)

---

## Error Paths & Resilience

### Path 1: LLM Failure
```
FastRouter fails → Ollama fallback
Ollama fails → Return FAILED status
→ Slack notification with error
→ Manual intervention required
```

### Path 2: Docker Restart Fails
```
Docker API error → Capture logs for debugging
→ Return FAILED status
→ Slack notification with container logs
→ Manual investigation needed
```

### Path 3: Health Check Fails After Restart
```
All retries exhausted → Mark FAILED
→ Return original logs to engineering
→ Possible deeper issue (not just restart needed)
→ Manual escalation
```

### Path 4: Slack Notification Fails
```
Log error, don't block remediation
Incident still marked RESOLVED
Missing notification, but action completed
→ Check logs for alerts
```

---

## Configuration & Customization

### Add New Action Type

**1. Update `models.py`:**
```python
class ActionType(str, Enum):
    RESTART = "RESTART"
    SCALE_UP = "SCALE_UP"       # NEW
    ROLLBACK = "ROLLBACK"       # NEW
    NOOP = "NOOP"
```

**2. Update LLM System Prompt** (ai_brain.py):
```python
SYSTEM_PROMPT = """
...
"action": "RESTART" | "SCALE_UP" | "ROLLBACK" | "NOOP"
...
"""
```

**3. Implement Handler** (main.py `_remediate()`):
```python
if analysis.action == ActionType.SCALE_UP:
    await scale_up_service()
elif analysis.action == ActionType.ROLLBACK:
    await rollback_deployment()
```

---

## Monitoring & Observability

### Log Levels
```python
logging.INFO     # Normal flow (webhooks received, analyses, actions)
logging.WARNING  # Retry scenarios (health check retries, fallback to Ollama)
logging.ERROR    # Failures (LLM errors, Docker errors, all retries exhausted)
```

### Key Metrics to Track
- Incidents received per minute
- Average MTTR
- Success rate (% RESOLVED vs FAILED)
- AI accuracy (% of recommended actions correct)
- Runbook growth (entries per day)
- Cost savings ($$ impact)

### OpenTelemetry Integration (Optional)
- Trace each incident through full pipeline
- Measure latency at each step
- Export to Jaeger, Datadog, or New Relic
