# Architecture Deep Dive — AegisOps GOD MODE v2.0

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      Docker Compose Network (aegis-network, bridge)           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │              AEGIS CORE — GOD MODE Backend (Port 8001)                │    │
│  │         FastAPI + WebSocket + Multi-Agent AI + Docker Ops             │    │
│  ├──────────────────────────────────────────────────────────────────────┤    │
│  │                                                                        │    │
│  │  POST /webhook                                                        │    │
│  │    │                                                                  │    │
│  │    ├─→ [1] PARSE  IncidentPayload (Pydantic validation)              │    │
│  │    ├─→ [2] STORE  in-memory incidents dict                           │    │
│  │    ├─→ [3] BROADCAST  incident.new  →  WebSocket clients             │    │
│  │    ├─→ [4] RETURN  200 OK immediately                                │    │
│  │    └─→ [5] BACKGROUND TASK: _remediate()                             │    │
│  │                                                                        │    │
│  │  _remediate() GOD MODE PIPELINE                                      │    │
│  │    │                                                                  │    │
│  │    ├─①─ RAG Retrieval (TF-IDF cosine on runbook.json)               │    │
│  │    │     → top-2 entries injected into SRE system prompt             │    │
│  │    │     → broadcast ai.thinking "Found N similar incidents"         │    │
│  │    │                                                                  │    │
│  │    ├─②─ SRE Analysis (streaming + non-streaming)                    │    │
│  │    │     → stream_analysis(): streams tokens → ai.stream frames      │    │
│  │    │     → analyze_logs(): produces AIAnalysis JSON                  │    │
│  │    │     → broadcast ai.complete                                      │    │
│  │    │                                                                  │    │
│  │    ├─③─ Multi-Agent Council                                          │    │
│  │    │     → SRE Agent vote (APPROVED)                                 │    │
│  │    │     → Security Officer LLM vote (APPROVED/REJECTED/NEEDS_REVIEW)│    │
│  │    │     → Auditor LLM vote (APPROVED/REJECTED/NEEDS_REVIEW)        │    │
│  │    │     → Each vote broadcast: council.vote                         │    │
│  │    │     → Final: council.decision                                   │    │
│  │    │     → 2/3 required; REJECTED → abort                           │    │
│  │    │                                                                  │    │
│  │    ├─④─ Execute Action                                               │    │
│  │    │     RESTART   → Docker SDK restart                              │    │
│  │    │     SCALE_UP  → spawn replicas → reconfigure Nginx              │    │
│  │    │     SCALE_DOWN→ remove replicas → reconfigure Nginx             │    │
│  │    │     NOOP      → resolve immediately                             │    │
│  │    │                                                                  │    │
│  │    ├─⑤─ Health Verification                                          │    │
│  │    │     → httpx GET /health with retries + delay                    │    │
│  │    │     → each attempt broadcast: health.check                      │    │
│  │    │                                                                  │    │
│  │    └─⑥─ Runbook Learning                                             │    │
│  │          → append to runbook.json (incident_id, logs, root_cause,   │    │
│  │            action, justification, confidence, replicas_used)         │    │
│  │                                                                        │    │
│  │  Background metrics loop (every 3s):                                 │    │
│  │    → Docker stats for all running containers                         │    │
│  │    → broadcast metrics + container.list frames                       │    │
│  │                                                                        │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│        ▲ webhooks          │ Docker API        │ Nginx exec          │        │
│        │                   ▼                   ▼                     │        │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │        │
│  │ BUGGY APP     │  │ AEGIS COCKPIT   │  │ AEGIS LB             │   │        │
│  │ Port 8000     │  │ Port 3000       │  │ Port 80              │   │        │
│  │ Flask target  │  │ React SRE UI    │  │ Nginx upstream LB    │   │        │
│  └──────────────┘  └─────────────────┘  └──────────────────────┘   │        │
│                            ↕ WebSocket /ws                            │        │
│  ┌─────────────────────────────────────────────────────────────────┐ │        │
│  │ AEGIS DASHBOARD (legacy Streamlit)  Port 8501                   │ │        │
│  └─────────────────────────────────────────────────────────────────┘ │        │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐         │
│  │ SHARED VOLUME  ./aegis_core/data:/app/data                       │         │
│  │  - runbook.json   (RAG knowledge base — auto-growing)            │         │
│  │  - sample_incidents.json                                          │         │
│  └─────────────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### AEGIS CORE — File-by-File

#### `aegis_core/app/main.py` — FastAPI Application & Orchestrator

**Entry point.** Registers all REST routes, the `/ws` WebSocket endpoint, and the background metrics loop.

**Lifespan management:**
- On startup: creates `_metrics_task` — an asyncio Task that calls `get_all_metrics()` every 3 seconds and broadcasts `metrics` + `container.list` frames to all WS clients
- On shutdown: cancels `_metrics_task`

**REST Routes:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook` | Receive incident; spawn remediation as background task |
| `GET` | `/incidents/{id}` | Query single incident status |
| `GET` | `/incidents` | List all incidents (in-memory, current session) |
| `GET` | `/containers` | List all running Docker containers |
| `GET` | `/metrics` | Live CPU/memory/network for all containers |
| `POST` | `/scale/{direction}` | Manual scale up/down (`?count=N` for up) |
| `GET` | `/health` | AegisOps Core health check (`{"status": "ok", "mode": "GOD_MODE", "version": "2.0.0"}`) |
| `GET` | `/topology` | Service dependency graph (nodes + edges) |
| `GET` | `/runbook` | Full RAG knowledge base contents |
| `GET` | `/rag/test` | Test RAG retrieval with `?logs=<text>` |

**WebSocket:**

| Endpoint | Description |
|----------|-------------|
| `WS /ws` | Persistent connection; receives all pipeline frames; sends `heartbeat` on `ping` |

**Core async function: `_remediate(payload, result)`**

Runs the complete 7-step GOD MODE pipeline. Wrapped in FastAPI `BackgroundTasks` so the HTTP response returns immediately at `RECEIVED` status while the pipeline executes asynchronously.

**Timeline helper `_timeline(result, status, msg, agent)`** — appends `TimelineEntry` objects to the incident result for full audit trail.

---

#### `aegis_core/app/ai_brain.py` — AI Brain v3.0

**The intelligence layer.** Handles RAG retrieval, LLM calls, streaming, and multi-agent council.

##### RAG Engine — TF-IDF Runbook Retrieval

```python
def get_relevant_runbook_entries(current_logs, top_k=2, min_similarity=0.05):
    """
    Algorithm:
      1. Load runbook.json → list of past incident dicts
      2. Build corpus: each entry's logs+alert_type+root_cause+action+justification
      3. Fit TfidfVectorizer(stop_words='english', ngram_range=(1,2),
                             max_features=5000, sublinear_tf=True)
         on [corpus_entries... , current_query]
      4. Cosine similarity: query_vec vs each corpus_vec
      5. Return top_k above min_similarity threshold (sorted descending)
    """
```

**Key properties:**
- **Zero external API calls** — entirely local computation with scikit-learn
- **Bigram matching** — "memory leak", "cpu spike" as single features
- **Sublinear TF** — log-normalises term frequency to reduce dominance of repeated words
- **Cold start** — empty runbook returns `[]`; agent reasons from first principles

##### RAG-Augmented System Prompt

```python
def _build_sre_system_prompt(rag_entries):
    rag_block = _format_rag_context(rag_entries)
    return _SRE_BASE + rag_block
```

The `RUNBOOK KNOWLEDGE` block is injected between the base instructions and the end marker. For each retrieved entry it shows: alert type, root cause, action, justification, replicas used, and a log snippet (first 200 chars).

##### LLM Client Strategy

```
Primary:  FastRouter (OpenAI-compatible, cloud)
          model: anthropic/claude-sonnet-4-20250514
          base_url: https://go.fastrouter.ai/api/v1

Fallback: Ollama (local, OpenAI-compatible)
          model: llama3.2:latest
          base_url: http://localhost:11434/v1
```

Both use `openai.OpenAI` client; all calls are wrapped with `asyncio.to_thread()` to avoid blocking the event loop. Temperature is fixed at `0.2` for deterministic, focused output.

##### Streaming Analysis

```python
async def stream_analysis(payload) -> AsyncGenerator[str, None]:
    """
    Sends the same RAG-augmented prompt with stream=True.
    Yields individual token strings → each broadcast as ai.stream frame.
    Typewriter effect in the React cockpit.
    Falls back to character-by-character if streaming fails.
    """
```

##### Non-Streaming Analysis

```python
async def analyze_logs(payload) -> AIAnalysis:
    """
    RAG retrieval → build system prompt → call LLM (primary → fallback)
    → parse JSON → return AIAnalysis(root_cause, action, justification,
                                      confidence, replica_count)
    """
```

**JSON parsing** strips markdown code fences before `json.loads()`.

##### Multi-Agent Council

```python
async def council_review(payload, analysis) -> CouncilDecision:
    """
    Agent A (SRE):      Already voted via analyze_logs → always APPROVED
    Agent B (Security): Reviews for safety risks → may REJECT
    Agent C (Auditor):  Checks compliance/proportionality → may REJECT
    2/3 majority → final_verdict = APPROVED; else REJECTED
    """
```

Each reviewing agent receives the plan text and returns `{"verdict": ..., "reasoning": ...}`. If an agent call fails, it auto-approves with an error note (fail-open by design for SRE).

---

#### `aegis_core/app/docker_ops.py` — Docker Operations

**Wraps the Docker Python SDK** (`docker.from_env()`). All functions use `asyncio.to_thread()`.

| Function | Description |
|----------|-------------|
| `restart_container(name, timeout)` | Restarts named container; raises on NotFound/APIError |
| `get_container_logs(name, tail)` | Returns last N log lines as decoded string |
| `list_running_containers()` | Returns list of `{name, status, image, id}` |
| `get_container_metrics(name)` | Single-container CPU/memory/network stats |
| `get_all_metrics()` | All containers in parallel via `asyncio.gather` |
| `scale_up(base_name, count, network)` | Clone base container into N replicas on aegis-network |
| `scale_down(base_name)` | Remove all `{base_name}-replica-*` containers |
| `reconfigure_nginx(base_name, replicas)` | Write upstream.conf + `nginx -s reload` |

**CPU calculation:**
```
cpu_pct = (cpu_delta / system_delta) × num_cpus × 100
```
where `cpu_delta = total_usage[now] - total_usage[prev]` and `system_delta` is the system-wide CPU time delta.

**Scale-up implementation:** For each replica index 1..N:
1. Remove stale replica container if it exists (force)
2. `client.containers.run(image, name=replica_name, detach=True, network="aegis-network", restart_policy="unless-stopped", environment=source.env)`

**Nginx reconfigure:**  Builds `upstream.conf` with `server {base}:8000;` + one line per replica. Writes it via Docker `put_archive()` (tar stream), then calls `nginx -s reload` via `exec_run()`.

---

#### `aegis_core/app/verification.py` — Health Check & Runbook Learning

**`verify_health(url, retries, delay)`**

Simple fixed-interval retry loop:
```
for attempt in 1..retries:
    await asyncio.sleep(delay)
    GET url → return True if HTTP 200
return False
```

Default: 3 retries, 5 second delay, 5 second timeout per request.

**`append_to_runbook(payload, analysis, council_approved, replicas_used)`**

Builds a `RunbookEntry` and appends it to `runbook.json`:
```json
{
  "incident_id": "...",
  "alert_type": "Memory Leak",
  "logs": "<full raw logs — fed to TF-IDF>",
  "container_name": "buggy-app-v2",
  "severity": "CRITICAL",
  "root_cause": "Memory leak in batch event handler",
  "action": "RESTART",
  "justification": "...",
  "confidence": 0.92,
  "council_approved": true,
  "replicas_used": 0,
  "resolved_at": "2026-02-21T18:50:06Z"
}
```

**Why full logs are saved:** The TF-IDF vectorizer builds similarity on the raw log text. Saving the full logs means future incidents with similar error messages, stack traces, or container names will retrieve this entry.

---

#### `aegis_core/app/ws_manager.py` — WebSocket Connection Manager

```python
class ConnectionManager:
    _connections: list[WebSocket]
    _lock: asyncio.Lock

    async def connect(ws)        # accept + append
    async def disconnect(ws)     # remove
    async def broadcast(frame)   # send JSON to all; auto-remove dead connections
    async def broadcast_raw(frame_type, data, incident_id)  # convenience wrapper
    @property count              # number of active connections
```

**Thread safety:** `asyncio.Lock` protects `_connections` list from concurrent mutation during broadcast.

**Dead connection cleanup:** If `ws.send_json()` raises, the connection is added to a `dead` list and removed after the broadcast loop completes.

---

#### `aegis_core/app/models.py` — Pydantic Data Models

```
IncidentPayload     Input from webhook (incident_id, alert_type, logs, container_name, severity, timestamp)
AIAnalysis          LLM output (root_cause, action: ActionType, justification, confidence, replica_count)
ActionType          Enum: RESTART | SCALE_UP | SCALE_DOWN | ROLLBACK | NOOP
CouncilRole         Enum: SRE_AGENT | SECURITY_OFFICER | AUDITOR
CouncilVerdict      Enum: APPROVED | REJECTED | NEEDS_REVIEW
CouncilVote         {role, verdict, reasoning, timestamp}
CouncilDecision     {votes, final_verdict, consensus: bool, summary}
ResolutionStatus    Enum: RECEIVED | ANALYSING | COUNCIL_REVIEW | APPROVED | EXECUTING | SCALING | VERIFYING | RESOLVED | FAILED
TimelineEntry       {ts, status, message, agent}
IncidentResult      Full incident state: payload fields + analysis + council_decision + status + timeline
ScaleEvent          {container_base, replica_count, replicas: list[str], lb_configured, timestamp}
WSFrameType         16 frame type constants for WebSocket messages
WSFrame             {type, incident_id, data, timestamp}
RunbookEntry        Persistent learning record (full logs + resolution details)
ContainerMetrics    {name, cpu_percent, memory_mb, memory_limit_mb, memory_percent, net_rx_bytes, net_tx_bytes, status, uptime_seconds, image}
```

---

#### `aegis_core/app/config.py` — Configuration

All settings from environment variables (`.env` file or container environment):

| Variable | Default | Purpose |
|----------|---------|---------|
| `FASTRTR_API_KEY` | (required) | FastRouter authentication key |
| `FASTRTR_BASE_URL` | `https://go.fastrouter.ai/api/v1` | FastRouter endpoint |
| `FASTRTR_MODEL` | `anthropic/claude-sonnet-4-20250514` | Primary LLM model |
| `LOG_TRUNCATE_CHARS` | `2000` | Max characters sent to LLM |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama local endpoint |
| `OLLAMA_MODEL` | `llama3.2:latest` | Fallback LLM model |
| `TARGET_CONTAINER` | `buggy-app-v2` | Container to restart/scale |
| `HEALTH_URL` | `http://buggy-app-v2:8000/health` | Health check URL |
| `VERIFY_DELAY_SECS` | `5` | Seconds between health retries |
| `VERIFY_RETRIES` | `3` | Number of health check attempts |
| `HEALTH_TIMEOUT_SECS` | `5` | Per-request health check timeout |
| `SLACK_WEBHOOK_URL` | (optional) | Slack incoming webhook URL |
| `MAX_REPLICAS` | `5` | Maximum scale-up replica count |
| `SCALE_COOLDOWN_SECS` | `30` | Reserved for cooldown logic |
| `NGINX_CONTAINER` | `aegis-lb` | Nginx container name |
| `NGINX_CONF_PATH` | `/etc/nginx/conf.d/upstream.conf` | Nginx upstream config path |
| `METRICS_INTERVAL_SECS` | `3` | WebSocket metrics push frequency |

---

#### `aegis_core/app/slack_notifier.py` — Slack Block Kit Notifications

Sends Slack Block Kit messages via the configured incoming webhook URL. Called at:
- `RECEIVED`, `ANALYSING`, `COUNCIL_REVIEW`, `EXECUTING`, `SCALING`, `VERIFYING`, `RESOLVED`, `FAILED`

Non-blocking: `httpx.RequestError` is caught and logged; notification failure never stops the remediation pipeline.

Message structure:
1. **Header block** with status emoji + `AegisOps GOD MODE – {STATUS}`
2. **Section** with incident ID + alert type
3. **Section** (if analysis available) with root cause + action + confidence
4. **Section** (if council available) with individual votes + final verdict
5. **Section** (if error) with error text in code block
6. **Divider**

---

### AEGIS INFRA — Buggy App

#### `aegis_infra/src/app.py` — Flask Application

**Daemon thread (`memory_monitor`)** starts on first request:
```python
def memory_monitor():
    while True:
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > 85:
            payload = {
                "incident_id": str(uuid.uuid4()),
                "container_name": "buggy-app-v2",
                "alert_type": "Memory Leak",
                "severity": "CRITICAL",
                "logs": f"Memory usage at {memory_percent}%...",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            requests.post("http://aegis-agent:8001/webhook", json=payload, timeout=5)
        time.sleep(2)
```

**Trigger endpoints:**

| Endpoint | Effect |
|----------|--------|
| `GET /health` | Returns `{"status": "ok"}` — used by verification loop |
| `GET /trigger_memory` | Appends 10 MB string to `memory_hog` global list; returns current MB allocated |
| `GET /trigger_cpu` | Starts daemon thread running `math.factorial(n)` in an infinite loop |
| `GET /trigger_db_latency` | `time.sleep(5)` to simulate a slow query |

---

### AEGIS COCKPIT — React SRE UI

**Multi-page React application** served by Nginx on port 3000.

**Routes:**
- `/` → `LandingPage` — marketing landing page
- `/login` → `LoginPage` — authentication form
- `/dashboard` → `Dashboard` — main SRE cockpit

**`Dashboard.jsx`** — the core component:
- Connects to `ws://aegis-agent:8001/ws` on mount
- Dispatches incoming frames to the appropriate panel components
- Manages connection state; auto-reconnects on disconnect

**Panel components:**

| Component | Displays |
|-----------|---------|
| `AIStreamPanel.jsx` | Typewriter-style AI reasoning tokens as they stream |
| `IncidentPanel.jsx` | Active incident, status, timeline, analysis result |
| `MetricsPanel.jsx` + `MetricsCharts.jsx` | Live CPU%, memory MB, network I/O per container |
| `TopologyPanel.jsx` | Service topology graph (nodes: agent, app, replica, lb, dashboard; edges: monitors, spawned, routes) |
| `ScaleControls.jsx` | Manual `POST /scale/up` and `POST /scale/down` buttons |
| `Header.jsx` | Connection status, current mode indicator |

---

### AEGIS LB — Nginx Load Balancer

**`nginx.conf`** — includes `/etc/nginx/conf.d/upstream.conf` and proxies all traffic to the `buggy_app` upstream.

**`upstream.conf`** (dynamically rewritten by AegisOps Core on scale events):
```nginx
upstream buggy_app {
    server buggy-app-v2:8000;
    server buggy-app-v2-replica-1:8000;    # added on SCALE_UP
    server buggy-app-v2-replica-2:8000;    # added on SCALE_UP
}
```

Rewrite mechanism: AegisOps Core builds the config string, writes it via `docker.put_archive()` as a tar stream into `/etc/nginx/conf.d/`, then calls `nginx -s reload` via `exec_run()`.

---

## WebSocket Frame Reference

All frames have the shape:
```json
{
  "type": "<WSFrameType>",
  "incident_id": "<string | null>",
  "data": "<any>",
  "timestamp": "<ISO-8601>"
}
```

| Frame Type | Trigger | Data |
|-----------|---------|------|
| `incident.new` | Webhook received | `{incident_id, alert_type, logs[:200]}` |
| `ai.thinking` | RAG retrieved / analysis starting | `{incident_id, message}` |
| `ai.stream` | Each LLM token chunk | `{incident_id, chunk, full_text}` |
| `ai.complete` | Full AIAnalysis ready | `{incident_id, analysis: AIAnalysis}` |
| `council.vote` | Each agent votes | `{incident_id, vote: CouncilVote}` |
| `council.decision` | Final council verdict | `{incident_id, decision: CouncilDecision}` |
| `docker.action` | Container action begins | `{incident_id, action, container}` |
| `scale.event` | Scale-up/down completed | `{incident_id, event: ScaleEvent}` |
| `health.check` | Each health attempt | `{incident_id, attempt, healthy}` |
| `status.update` | Pipeline stage change | `{incident_id, status, message}` |
| `resolved` | Incident resolved | `{incident_id, resolved_at}` |
| `failed` | Incident failed | `{incident_id, error}` |
| `metrics` | Every 3 seconds | `[ContainerMetrics, ...]` |
| `container.list` | Every 3 seconds | `[{name, status, image, id}, ...]` |
| `topology` | Reserved | — |
| `heartbeat` | On connect / client ping | `{status: "connected"}` or `{status: "alive"}` |

---

## Data Persistence

```
./aegis_core/data/          (host)
    └── runbook.json        ← persisted via Docker volume mount
                              grows with every resolved incident
                              queried by TF-IDF RAG on every new incident
```

The volume mount in `docker-compose.yml`:
```yaml
volumes:
  - ./aegis_core/data:/app/data
```

`runbook.json` is a JSON array. Each element is a `RunbookEntry` dict. The TF-IDF vectorizer is rebuilt from scratch on every `get_relevant_runbook_entries()` call (stateless, fast for O(100s) entries).

---

## Error Paths and Resilience

### LLM Failure
```
FastRouter → exception → log warning → try Ollama
Ollama → exception → raise RuntimeError
RuntimeError → _remediate catches → status=FAILED → broadcast failed → Slack notify
```

### Council Failure
```
Security/Auditor LLM → exception → auto-approve with error note (fail-open)
SRE + 2 auto-approved = 3/3 → APPROVED → proceed
```
This ensures a council infrastructure failure doesn't block remediation entirely.

### Scale-Up Failure
```
scale_up() → exception → log warning → fall back to restart_container()
restart_container() → exception → status=FAILED
```

### Health Check Failure
```
All retries exhausted → return False
→ status=FAILED
→ runbook NOT updated (only save on success)
→ broadcast failed → Slack notify
```

### Nginx Reconfigure Failure
```
Container 'aegis-lb' not found → log warning → return False
→ scale still recorded (replicas running, just no LB update)
```

### Slack Notification Failure
```
httpx.RequestError → log warning → return (non-fatal)
Remediation continues regardless
```

---

## Scalability Considerations

### Current Design
- **In-memory incident tracker**: data lost on agent restart
- **Single Docker host**: all containers on one machine
- **Synchronous TF-IDF rebuild**: O(N × features) on each incident; fine for O(100s) runbook entries

### Path to Production
```
Database:       Replace dict with PostgreSQL for persistent incident storage
Queue:          RabbitMQ/Kafka for incident batching and multi-agent replay
Kubernetes:     Deploy aegis-agent as a Deployment with HPA
Persistent RAG: Vector database (Chroma, Pinecone) instead of TF-IDF file
Authentication: JWT/OAuth2 on all REST endpoints and WebSocket
Secrets:        Vault or Kubernetes Secrets instead of .env file
Multi-tenant:   Namespace incidents by team/service
Tracing:        OpenTelemetry spans through the full pipeline
```

---

## Monitoring & Observability

### Log Levels
```python
logging.INFO     # Normal flow: webhook received, analyses, council votes, actions
logging.WARNING  # Retry scenarios: LLM fallback, health retries, council auto-approve
logging.ERROR    # Failures: all retries exhausted, Docker API errors
logging.DEBUG    # Metrics loop errors (suppressed in normal operation)
```

### Built-in Metrics
- `GET /metrics` — live container CPU/memory/network via Docker stats API
- `GET /health` — agent status + WebSocket client count
- `GET /runbook` — total runbook entry count (RAG corpus size)

### Key Operational Metrics to Track
| Metric | Why |
|--------|-----|
| Incidents resolved / failed per hour | Success rate |
| Average pipeline duration (webhook → resolved) | MTTR |
| LLM primary success rate | FastRouter health |
| RAG retrieval hit rate (entries > 0) | Knowledge base coverage |
| Council rejection rate | Safety signal |
| Runbook entries total | Learning velocity |
| WebSocket client count | Cockpit adoption |

