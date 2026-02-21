# API Reference — AegisOps GOD MODE v2.0

## AegisOps Core API (Port 8001)

AegisOps Core exposes a **FastAPI** server with REST endpoints and a **WebSocket** endpoint.
All REST responses use JSON. The WebSocket endpoint streams real-time frames to connected clients (the React SRE Cockpit).

---

## Base URLs

```
REST:      http://localhost:8001       (local development)
           http://aegis-agent:8001     (Docker internal)
WebSocket: ws://localhost:8001/ws      (local development)
           ws://aegis-agent:8001/ws    (Docker internal)
Swagger:   http://localhost:8001/docs
ReDoc:     http://localhost:8001/redoc
```

---

## REST Endpoints

### POST /webhook — Receive Incident

**Description:** Receive an incident alert. Triggers the full GOD MODE remediation pipeline asynchronously. Returns immediately with `RECEIVED` status.

**Request Body:**
```json
{
  "incident_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "Memory Leak",
  "logs": "ERROR: Memory usage at 98%. Object count: 1,500,000...",
  "container_name": "buggy-app-v2",
  "severity": "CRITICAL",
  "timestamp": "2026-02-21T03:15:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `incident_id` | string | ✅ | Unique identifier (UUID recommended) |
| `alert_type` | string | ✅ | Category, e.g. `"Memory Leak"`, `"CPU Spike"` |
| `logs` | string | ✅ | Raw application log snippet |
| `container_name` | string | ❌ | Target container name |
| `severity` | string | ❌ | `CRITICAL`, `WARNING`, `INFO` |
| `timestamp` | string | ❌ | ISO 8601 timestamp |

**Response (immediate — 200 OK):**
```json
{
  "incident_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "Memory Leak",
  "status": "RECEIVED",
  "analysis": null,
  "council_decision": null,
  "resolved_at": null,
  "error": null,
  "replicas_spawned": 0,
  "timeline": [
    {
      "ts": "2026-02-21T03:15:00.123Z",
      "status": "RECEIVED",
      "message": "Incident received via webhook.",
      "agent": null
    }
  ]
}
```

**Background pipeline stages (async — monitor via GET /incidents/{id} or WebSocket):**

| Status | Meaning |
|--------|---------|
| `RECEIVED` | Webhook accepted, pipeline starting |
| `ANALYSING` | SRE Agent analyzing logs (RAG-augmented) |
| `COUNCIL_REVIEW` | Multi-Agent Council voting |
| `APPROVED` | Council approved the action |
| `EXECUTING` | Remediation action in progress |
| `SCALING` | Auto-scaling replicas being spawned |
| `VERIFYING` | Health check loop running |
| `RESOLVED` | Incident fixed and verified |
| `FAILED` | Pipeline failed; manual intervention may be needed |

**Example:**
```bash
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "test-001",
    "alert_type": "Memory Leak",
    "severity": "CRITICAL",
    "logs": "ERROR: Memory usage at 98%",
    "container_name": "buggy-app-v2"
  }'
```

---

### GET /incidents/{incident_id} — Get Incident Status

**Description:** Query the full state of a specific incident.

**Example:**
```bash
curl http://localhost:8001/incidents/test-001
```

**Response (RESOLVED example):**
```json
{
  "incident_id": "test-001",
  "alert_type": "Memory Leak",
  "status": "RESOLVED",
  "analysis": {
    "root_cause": "Memory leak in batch event handler",
    "action": "RESTART",
    "justification": "Pattern matches known issue. Restart will release held memory.",
    "confidence": 0.92,
    "replica_count": 2
  },
  "council_decision": {
    "votes": [
      {
        "role": "SRE_AGENT",
        "verdict": "APPROVED",
        "reasoning": "Proposing RESTART: Pattern matches known memory leak",
        "timestamp": "2026-02-21T03:15:01Z"
      },
      {
        "role": "SECURITY_OFFICER",
        "verdict": "APPROVED",
        "reasoning": "Container restart is a safe, standard SRE operation",
        "timestamp": "2026-02-21T03:15:02Z"
      },
      {
        "role": "AUDITOR",
        "verdict": "APPROVED",
        "reasoning": "Action is proportionate and fully logged",
        "timestamp": "2026-02-21T03:15:03Z"
      }
    ],
    "final_verdict": "APPROVED",
    "consensus": true,
    "summary": "Council voted 3/3 APPROVED. Final: APPROVED"
  },
  "resolved_at": "2026-02-21T03:15:08Z",
  "error": null,
  "replicas_spawned": 0,
  "timeline": [
    { "status": "RECEIVED", "message": "Incident received via webhook.", "agent": null },
    { "status": "RAG_RETRIEVAL", "message": "Retrieved 2 similar past incidents (best match: 91.2%)", "agent": "RAG_ENGINE" },
    { "status": "ANALYSING", "message": "AI SRE Agent is analysing the incident…", "agent": "SRE_AGENT" },
    { "status": "AI_COMPLETE", "message": "Root cause: Memory leak → RESTART", "agent": "SRE_AGENT" },
    { "status": "COUNCIL_VOTE", "message": "SRE_AGENT: APPROVED – Proposing RESTART", "agent": "SRE_AGENT" },
    { "status": "COUNCIL_VOTE", "message": "SECURITY_OFFICER: APPROVED – Safe standard operation", "agent": "SECURITY_OFFICER" },
    { "status": "COUNCIL_VOTE", "message": "AUDITOR: APPROVED – Proportionate and logged", "agent": "AUDITOR" },
    { "status": "COUNCIL_DECISION", "message": "Council voted 3/3 APPROVED. Final: APPROVED", "agent": null },
    { "status": "APPROVED", "message": "Council approved the action.", "agent": null },
    { "status": "EXECUTING", "message": "Executing: RESTART", "agent": null },
    { "status": "RESTARTED", "message": "Container status: running", "agent": null },
    { "status": "VERIFYING", "message": "Running health checks…", "agent": null },
    { "status": "RESOLVED", "message": "Service is healthy! Incident resolved.", "agent": null }
  ]
}
```

---

### GET /incidents — List All Incidents

**Description:** Returns all incidents processed in the current agent session (in-memory; clears on agent restart).

**Example:**
```bash
curl http://localhost:8001/incidents
```

**Response:** Array of `IncidentResult` objects (same schema as above).

---

### GET /containers — List Running Containers

**Description:** Returns all Docker containers currently running on the host.

**Example:**
```bash
curl http://localhost:8001/containers
```

**Response:**
```json
[
  { "name": "buggy-app-v2", "status": "running", "image": "aegisops-buggy-app-v2:latest", "id": "a1b2c3d4" },
  { "name": "aegis-agent", "status": "running", "image": "aegisops-aegis-agent:latest", "id": "e5f6g7h8" },
  { "name": "aegis-lb", "status": "running", "image": "aegisops-aegis-lb:latest", "id": "i9j0k1l2" },
  { "name": "aegis-cockpit", "status": "running", "image": "aegisops-aegis-cockpit:latest", "id": "m3n4o5p6" }
]
```

---

### GET /metrics — Live Container Metrics

**Description:** Returns live CPU, memory, and network I/O statistics for all running containers, sourced directly from the Docker stats API.

**Example:**
```bash
curl http://localhost:8001/metrics
```

**Response:**
```json
[
  {
    "name": "buggy-app-v2",
    "cpu_percent": 12.5,
    "memory_mb": 128.4,
    "memory_limit_mb": 2048.0,
    "memory_percent": 6.27,
    "net_rx_bytes": 1048576,
    "net_tx_bytes": 524288,
    "status": "running",
    "uptime_seconds": 3600.0,
    "image": "aegisops-buggy-app-v2:latest"
  }
]
```

The same data is pushed over WebSocket as `metrics` frames every 3 seconds.

---

### POST /scale/{direction} — Manual Scaling

**Description:** Manually trigger scale-up or scale-down of the buggy app. Does not require an incident or council approval.

**Path parameter:** `direction` — `"up"` or `"down"`

**Query parameter (for up only):** `count` (int, default: 2) — number of replicas to spawn

**Examples:**
```bash
# Scale up to 3 replicas
curl -X POST "http://localhost:8001/scale/up?count=3"

# Scale down (remove all replicas)
curl -X POST http://localhost:8001/scale/down
```

**Response (scale up):**
```json
{
  "container_base": "buggy-app-v2",
  "replica_count": 3,
  "replicas": ["buggy-app-v2-replica-1", "buggy-app-v2-replica-2", "buggy-app-v2-replica-3"],
  "lb_configured": true,
  "timestamp": "2026-02-21T03:15:00Z"
}
```

**Response (scale down):**
```json
{
  "removed": ["buggy-app-v2-replica-1", "buggy-app-v2-replica-2"]
}
```

After a scale-up, Nginx upstream is automatically reconfigured to include all replicas. After scale-down, Nginx upstream reverts to only the base container.

---

### GET /health — Agent Health Check

**Description:** Check that AegisOps Core is running. Also returns WebSocket client count.

**Example:**
```bash
curl http://localhost:8001/health
```

**Response:**
```json
{
  "status": "ok",
  "mode": "GOD_MODE",
  "version": "2.0.0",
  "ws_clients": 2
}
```

---

### GET /topology — Service Topology

**Description:** Returns a graph representation of the running service topology. Used by the `TopologyPanel` in the React Cockpit.

**Example:**
```bash
curl http://localhost:8001/topology
```

**Response:**
```json
{
  "nodes": [
    { "id": "aegis-agent", "type": "agent", "status": "running", "image": "..." },
    { "id": "buggy-app-v2", "type": "app", "status": "running", "image": "..." },
    { "id": "aegis-lb", "type": "loadbalancer", "status": "running", "image": "..." },
    { "id": "buggy-app-v2-replica-1", "type": "replica", "status": "running", "image": "..." }
  ],
  "edges": [
    { "from": "aegis-agent", "to": "buggy-app-v2", "label": "monitors" },
    { "from": "aegis-agent", "to": "buggy-app-v2-replica-1", "label": "spawned" },
    { "from": "aegis-lb", "to": "buggy-app-v2", "label": "routes" }
  ]
}
```

**Node types:** `agent`, `app`, `replica`, `loadbalancer`, `dashboard`, `unknown`

---

### GET /runbook — RAG Knowledge Base

**Description:** Returns the full contents of `runbook.json` — the self-growing RAG knowledge base.

**Example:**
```bash
curl http://localhost:8001/runbook
```

**Response:**
```json
{
  "entries": [
    {
      "incident_id": "550e8400-...",
      "alert_type": "Memory Leak",
      "logs": "ERROR: Memory usage at 98%...",
      "container_name": "buggy-app-v2",
      "severity": "CRITICAL",
      "root_cause": "Memory leak in batch event handler",
      "action": "RESTART",
      "justification": "Restart releases held memory",
      "confidence": 0.92,
      "council_approved": true,
      "replicas_used": 0,
      "resolved_at": "2026-02-21T03:15:08Z"
    }
  ],
  "total": 1
}
```

---

### GET /rag/test — Test RAG Retrieval

**Description:** Test the RAG retrieval engine with a custom log string. Returns the most similar past incidents from the runbook.

**Query parameter:** `logs` (string) — the log text to search for

**Example:**
```bash
curl "http://localhost:8001/rag/test?logs=CPU+usage+at+98+percent+infinite+loop"
```

**Response:**
```json
{
  "query": "CPU usage at 98 percent infinite loop",
  "retrieved": [
    {
      "incident_id": "cpu-001",
      "alert_type": "CPU Spike",
      "root_cause": "Infinite factorial loop",
      "action": "RESTART",
      "justification": "Restart terminates the runaway thread",
      "logs": "CPU at 98%...",
      "similarity_score": 0.7823,
      "container_name": "buggy-app-v2",
      "severity": "CRITICAL",
      "replicas_used": 0
    }
  ],
  "count": 1
}
```

---

## WebSocket Endpoint

### WS /ws — Real-Time Event Stream

**Description:** Persistent WebSocket connection for real-time incident pipeline events, live container metrics, and AI streaming. Used by the React SRE Cockpit.

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:8001/ws');
```

**Keep-alive:** Send `"ping"` text; server responds with `{"type": "heartbeat", "data": {"status": "alive"}}`.

**All frames follow this structure:**
```json
{
  "type": "<WSFrameType>",
  "incident_id": "<string | null>",
  "data": "<any>",
  "timestamp": "<ISO-8601>"
}
```

**Frame types emitted by the server:**

| Frame Type | When | Data Payload |
|-----------|------|-------------|
| `heartbeat` | On connect; on `ping` | `{"status": "connected"}` |
| `incident.new` | New webhook received | `{incident_id, alert_type, logs[:200]}` |
| `status.update` | Pipeline stage changes | `{incident_id, status, message}` |
| `ai.thinking` | RAG result / analysis start | `{incident_id, message}` |
| `ai.stream` | Each LLM token | `{incident_id, chunk, full_text}` |
| `ai.complete` | Full AI analysis ready | `{incident_id, analysis: AIAnalysis}` |
| `council.vote` | Each agent votes | `{incident_id, vote: {role, verdict, reasoning, timestamp}}` |
| `council.decision` | Final council verdict | `{incident_id, decision: CouncilDecision}` |
| `docker.action` | Container action begins | `{incident_id, action, container}` |
| `scale.event` | Scale-up/down completed | `{incident_id, event: ScaleEvent}` |
| `health.check` | Each health check attempt | `{incident_id, attempt, healthy}` |
| `resolved` | Incident fully resolved | `{incident_id, resolved_at}` |
| `failed` | Incident failed | `{incident_id, error}` |
| `metrics` | Every 3 seconds | `[ContainerMetrics, ...]` |
| `container.list` | Every 3 seconds | `[{name, status, image, id}, ...]` |

**JavaScript client example:**
```javascript
const ws = new WebSocket('ws://localhost:8001/ws');

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  switch (frame.type) {
    case 'ai.stream':
      // Append chunk to typewriter display
      appendToAIPanel(frame.data.chunk);
      break;
    case 'council.vote':
      // Show vote in council panel
      displayVote(frame.data.vote);
      break;
    case 'metrics':
      // Update metrics charts
      updateCharts(frame.data);
      break;
    case 'resolved':
      // Show success banner
      showResolved(frame.data.incident_id);
      break;
  }
};

// Keep-alive
setInterval(() => ws.send('ping'), 30000);
```

---

## Buggy App API (Port 8000)

### GET /health — Health Check

**Description:** Always returns 200 OK when the container is running. Used by AegisOps Core's verification loop.

**Response:**
```json
{"status": "ok"}
```

---

### GET /trigger_memory — Simulate Memory Leak

**Description:** Allocates 10 MB of string data and appends it to a global list. Call repeatedly to increase memory pressure.

**Response:**
```json
{"message": "Memory trigger activated", "current_memory_usage_mb": 30}
```

When memory exceeds 85% system-wide, the background daemon automatically sends a webhook to AegisOps Core.

```bash
# Trigger 5 times to build memory pressure
for i in {1..5}; do curl http://localhost:8000/trigger_memory; done
```

---

### GET /trigger_cpu — Simulate CPU Spike

**Description:** Starts a daemon thread that runs `math.factorial(n)` in an infinite loop, maxing out one CPU core.

**Response:**
```json
{"message": "CPU trigger activated - factorial thread started"}
```

---

### GET /trigger_db_latency — Simulate DB Latency

**Description:** Forces a 5-second `time.sleep()` to simulate a slow database query locking the Flask worker.

**Response (after 5 seconds):**
```json
{"message": "DB latency simulation completed"}
```

---

## Nginx Load Balancer (Port 80)

All HTTP traffic on port 80 is proxied by Nginx to the `buggy_app` upstream, which includes `buggy-app-v2` and any active replicas. There are no API endpoints on port 80 itself — it is purely a pass-through load balancer for the buggy app.

```bash
# Access buggy app through the load balancer
curl http://localhost:80/health
```

---

## Data Models

### IncidentPayload (Webhook Input)

```python
{
  "incident_id": str,        # UUID
  "alert_type": str,         # "Memory Leak" | "CPU Spike" | ...
  "logs": str,               # Raw log text
  "container_name": str,     # Optional, e.g. "buggy-app-v2"
  "severity": str,           # Optional: "CRITICAL" | "WARNING" | "INFO"
  "timestamp": str           # Optional: ISO 8601
}
```

### AIAnalysis (LLM Output)

```python
{
  "root_cause": str,         # One-line diagnosis
  "action": ActionType,      # RESTART | SCALE_UP | SCALE_DOWN | ROLLBACK | NOOP
  "justification": str,      # Why this action was chosen
  "confidence": float,       # 0.0–1.0 confidence score
  "replica_count": int       # Desired replicas for SCALE_UP (default 2)
}
```

### ActionType Enum

| Value | Effect |
|-------|--------|
| `RESTART` | Restart the target container via Docker SDK |
| `SCALE_UP` | Spawn N replicas + reconfigure Nginx LB |
| `SCALE_DOWN` | Remove all replicas + reconfigure Nginx LB |
| `NOOP` | No action; mark resolved immediately |
| `ROLLBACK` | Reserved for future deployment rollback implementation |

### ResolutionStatus Enum

```
RECEIVED → ANALYSING → COUNCIL_REVIEW → APPROVED → EXECUTING / SCALING → VERIFYING → RESOLVED
                                       └─ REJECTED → FAILED
```

### CouncilVote

```python
{
  "role": "SRE_AGENT" | "SECURITY_OFFICER" | "AUDITOR",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_REVIEW",
  "reasoning": str,
  "timestamp": str   # ISO 8601
}
```

### CouncilDecision

```python
{
  "votes": [CouncilVote, CouncilVote, CouncilVote],
  "final_verdict": "APPROVED" | "REJECTED",
  "consensus": bool,   # true if ≥ 2/3 approved
  "summary": str       # "Council voted 3/3 APPROVED. Final: APPROVED"
}
```

### ContainerMetrics

```python
{
  "name": str,
  "cpu_percent": float,
  "memory_mb": float,
  "memory_limit_mb": float,
  "memory_percent": float,
  "net_rx_bytes": int,
  "net_tx_bytes": int,
  "status": str,           # "running" | "exited" | ...
  "uptime_seconds": float,
  "image": str
}
```

### ScaleEvent

```python
{
  "container_base": str,    # "buggy-app-v2"
  "replica_count": int,     # Requested count
  "replicas": [str],        # Actual spawned names
  "lb_configured": bool,    # True if Nginx was updated
  "timestamp": str
}
```

### RunbookEntry (in runbook.json)

```json
{
  "incident_id": "string",
  "alert_type": "Memory Leak",
  "logs": "<full raw logs — used for TF-IDF similarity>",
  "container_name": "buggy-app-v2",
  "severity": "CRITICAL",
  "root_cause": "Memory leak in batch event handler",
  "action": "RESTART",
  "justification": "Restart will release held memory",
  "confidence": 0.92,
  "council_approved": true,
  "replicas_used": 0,
  "resolved_at": "2026-02-21T03:15:08Z"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (e.g., invalid scale direction) |
| `404` | Incident not found |
| `422` | Validation error (Pydantic schema mismatch) |
| `500` | Internal server error (Docker API, etc.) |

---

## Rate Limits & Performance

| Limit | Value | Notes |
|-------|-------|-------|
| Concurrent incidents | Unlimited | Fully async; all run in parallel |
| Max log size | No hard limit | Truncated to `LOG_TRUNCATE_CHARS` (default 2000) before LLM |
| LLM response timeout | ~30s | FastRouter then Ollama fallback |
| Health check timeout | 5 seconds per attempt | Configurable via `HEALTH_TIMEOUT_SECS` |
| Metrics push interval | 3 seconds | Configurable via `METRICS_INTERVAL_SECS` |
| Max scale-up replicas | 5 | Configurable via `MAX_REPLICAS` |
| Incidents persisted | Session only | In-memory; cleared on agent restart |

---

## Common Testing Workflows

### Workflow 1: Full Pipeline Test

```bash
# Step 1: Send manual incident
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "manual-001",
    "alert_type": "Memory Leak",
    "severity": "CRITICAL",
    "logs": "ERROR: Memory usage at 98%. OOM imminent.",
    "container_name": "buggy-app-v2"
  }'

# Step 2: Poll for status (pipeline takes 5-15s)
sleep 10
curl http://localhost:8001/incidents/manual-001

# Step 3: View full runbook (learning happened)
curl http://localhost:8001/runbook
```

### Workflow 2: Automatic Incident via Trigger

```bash
# Trigger memory leak (repeat to increase pressure above 85%)
curl http://localhost:8000/trigger_memory
sleep 2
curl http://localhost:8000/trigger_memory
sleep 2
curl http://localhost:8000/trigger_memory

# Watch AegisOps respond (check logs)
docker-compose logs aegis-agent -f --tail=50
```

### Workflow 3: Manual Scale Test

```bash
# Scale up to 2 replicas
curl -X POST "http://localhost:8001/scale/up?count=2"

# Check containers and topology
curl http://localhost:8001/containers
curl http://localhost:8001/topology

# Scale back down
curl -X POST http://localhost:8001/scale/down
```

### Workflow 4: RAG Test

```bash
# After at least one incident has been resolved:
curl "http://localhost:8001/rag/test?logs=memory+leak+oom+heap+growing"
# Returns: similar past incidents with similarity scores
```

### Workflow 5: WebSocket Test

```bash
# Using websocat (install: brew install websocat)
websocat ws://localhost:8001/ws
# Type: ping  → server responds with heartbeat
# Watch all frames as an incident unfolds
```

---

## API Authentication

The current version has **no authentication**. All endpoints are open. For production deployment, add:

- **API Key middleware** on FastAPI routes
- **JWT tokens** for WebSocket connections
- **IP whitelisting** for the `/webhook` endpoint
- **OAuth2** for the SRE Cockpit

See `aegis_core/app/main.py` for hook points to add FastAPI middleware.
