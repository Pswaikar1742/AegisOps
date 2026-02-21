# API Reference

## AegisOps Core API (Port 8001)

AegisOps Core exposes a FastAPI server with the following endpoints.

---

## Base URL

```
http://localhost:8001  (local)
http://aegis-agent:8001  (docker)
```

---

## Endpoints

### 1. Receive Incident Webhook

**Endpoint:** `POST /webhook`

**Description:** Receive an incident alert from the Buggy App. Triggers the full remediation pipeline asynchronously.

**Request Body:**
```json
{
  "incident_id": "string (UUID)",
  "container_name": "string",
  "alert_type": "string (e.g., 'Memory Leak', 'CPU Spike')",
  "severity": "string (e.g., 'CRITICAL', 'WARNING')",
  "logs": "string (raw application logs)",
  "timestamp": "string (ISO 8601)"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "550e8400-e29b-41d4-a716-446655440000",
    "container_name": "buggy-app-v2",
    "alert_type": "Memory Leak",
    "severity": "CRITICAL",
    "logs": "ERROR: Memory usage at 98%. Object count: 1,500,000...",
    "timestamp": "2024-02-21T03:15:00Z"
  }'
```

**Response (Immediate):**
```json
{
  "incident_id": "550e8400-e29b-41d4-a716-446655440000",
  "container_name": "buggy-app-v2",
  "status": "RECEIVED",
  "analysis": null,
  "error": null
}
```

**Status Values:**
- `RECEIVED` - Webhook accepted, processing started
- `ANALYZING` - AI analyzing logs
- `EXECUTING` - Remediation action in progress
- `RESOLVED` - Incident fixed and verified
- `FAILED` - Remediation failed, manual intervention needed

**Pipeline (Async - runs in background):**
1. ✅ **200 OK** response returned immediately
2. 🧠 **AI Reasoning** - Analyze logs → determine root cause & action
3. ⚡ **Execute** - Run remediation (e.g., restart container)
4. ✅ **Verify** - Health check with retries
5. 📚 **Learn** - Append to runbook.json
6. 📡 **Notify** - Send Slack message with status

---

### 2. Get Incident Status

**Endpoint:** `GET /incidents/{incident_id}`

**Description:** Query status of a specific incident.

**Example Request:**
```bash
curl http://localhost:8001/incidents/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "incident_id": "550e8400-e29b-41d4-a716-446655440000",
  "container_name": "buggy-app-v2",
  "status": "RESOLVED",
  "analysis": {
    "root_cause": "Memory leak in batch event handler",
    "action": "RESTART",
    "justification": "Pattern matches known issue from 2024-02-19. Restart will release memory."
  },
  "error": null
}
```

---

### 3. List All Incidents

**Endpoint:** `GET /incidents`

**Description:** Get list of all incidents processed in current session.

**Example Request:**
```bash
curl http://localhost:8001/incidents
```

**Response:**
```json
{
  "total": 3,
  "incidents": [
    {
      "incident_id": "550e8400-e29b-41d4-a716-446655440000",
      "container_name": "buggy-app-v2",
      "status": "RESOLVED",
      "timestamp": "2024-02-21T03:15:00Z"
    },
    {
      "incident_id": "660e8400-e29b-41d4-a716-446655440001",
      "container_name": "buggy-app-v2",
      "status": "FAILED",
      "timestamp": "2024-02-21T03:20:00Z"
    },
    {
      "incident_id": "770e8400-e29b-41d4-a716-446655440002",
      "container_name": "buggy-app-v2",
      "status": "RESOLVED",
      "timestamp": "2024-02-21T03:25:00Z"
    }
  ]
}
```

---

### 4. API Documentation (Auto-generated)

**Endpoint:** `GET /docs`

**Description:** Interactive Swagger UI for exploring all endpoints.

**URL:** http://localhost:8001/docs

**Alternative:** ReDoc at http://localhost:8001/redoc

---

## Buggy App API (Port 8000)

### Health Check

**Endpoint:** `GET /health`

**Description:** Check if the Buggy App is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

### Trigger Memory Leak

**Endpoint:** `GET /trigger_memory`

**Description:** Simulate a memory leak by allocating 10MB chunks.

**Response:**
```json
{
  "message": "Memory trigger activated",
  "current_memory_usage_mb": 10
}
```

**Call multiple times** to increase memory pressure:
```bash
for i in {1..10}; do
  curl http://localhost:8000/trigger_memory
  sleep 1
done
```

**Result:** Memory grows, AegisOps detects and restarts container

---

### Trigger CPU Spike

**Endpoint:** `GET /trigger_cpu`

**Description:** Simulate high CPU usage with infinite factorial calculation.

**Response:**
```json
{
  "message": "CPU trigger activated - factorial thread started"
}
```

---

### Trigger Database Latency

**Endpoint:** `GET /trigger_db_latency`

**Description:** Simulate slow database response (5-second sleep).

**Response:**
```json
{
  "message": "DB latency simulation completed"
}
```

---

## Data Models

### IncidentPayload (Webhook Input)

```python
{
  "incident_id": str,           # UUID of incident
  "container_name": str,        # Target container
  "alert_type": str,            # Type of alert (Memory Leak, CPU Spike, etc)
  "severity": str,              # CRITICAL, WARNING, INFO
  "logs": str,                  # Raw application logs
  "timestamp": str              # ISO 8601 timestamp
}
```

### IncidentResult (API Response)

```python
{
  "incident_id": str,           # UUID of incident
  "container_name": str,        # Target container
  "status": ResolutionStatus,   # RECEIVED, ANALYZING, EXECUTING, RESOLVED, FAILED
  "analysis": AIAnalysis | None,# AI diagnostics
  "error": str | None           # Error message if FAILED
}
```

### AIAnalysis (AI Output)

```python
{
  "root_cause": str,            # One-line root cause summary
  "action": ActionType,         # RESTART, SCALE_UP, ROLLBACK, NOOP
  "justification": str          # Why this action was chosen
}
```

### ActionType Enum

```python
RESTART    # Restart container
SCALE_UP   # Scale up resources (future)
ROLLBACK   # Rollback deployment (future)
NOOP       # No operation needed
```

### ResolutionStatus Enum

```python
RECEIVED    # Webhook received
ANALYZING   # AI analyzing
EXECUTING   # Action executing
RESOLVED    # Fixed and verified
FAILED      # Failed, needs manual intervention
```

---

## Runbook Entry (JSON)

**File:** `data/runbook.json`

```json
{
  "entries": [
    {
      "timestamp": "2024-02-21T03:15:00Z",
      "issue": "Memory Leak in Event Handler",
      "fix": "RESTART",
      "verified_healthy": true,
      "context": {
        "service": "api-backend",
        "threshold": "85%",
        "similar_issues": ["2024-02-19T23:42:00Z", "2024-02-18T15:30:00Z"]
      }
    }
  ]
}
```

---

## Sample Incident Data

**File:** `data/sample_incidents.json`

Used by dashboard when API is unavailable:

```json
{
  "incident_id": "demo-001",
  "affected_service": "api-backend",
  "slo_breach": "P99 latency > 5s",
  "root_cause": "Memory leak in event handler",
  "severity": "CRITICAL",
  "suggested_action": "RESTART"
}
```

---

## Common Workflows

### Workflow 1: Testing the Full Pipeline

```bash
# 1. Trigger memory leak
curl http://localhost:8000/trigger_memory

# 2. Check incident was received
sleep 1
curl http://localhost:8001/incidents

# 3. Wait for resolution
sleep 5

# 4. Check final status
curl http://localhost:8001/incidents/...  # use incident_id from step 2
```

---

### Workflow 2: Simulating Multiple Incidents

```bash
# Terminal 1: Watch logs
docker-compose logs -f aegis-agent

# Terminal 2: Send 3 sequential incidents
for i in {1..3}; do
  echo "Incident $i..."
  curl -X POST http://localhost:8001/webhook \
    -H "Content-Type: application/json" \
    -d "{\"incident_id\": \"test-$i\", \"container_name\": \"buggy-app-v2\", ...}"
  sleep 3
done
```

---

### Workflow 3: Monitoring Dashboard

```bash
# Open in browser
http://localhost:8501

# Watch incident lifecycle progress in real-time
# Check runbook growth
# View business impact ($ saved)
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Webhook received successfully |
| 422 | Invalid request body (validation error) |
| 500 | Internal server error |

### Error Response

```json
{
  "detail": "string (error description)"
}
```

---

## Rate Limiting & Performance

| Limit | Value |
|-------|-------|
| Max incidents/second | 100 (per AegisOps instance) |
| Max log size | 100KB (truncated to 2000 chars) |
| LLM response timeout | 30 seconds |
| Health check timeout | 5 seconds |
| Background task timeout | 5 minutes |

---

## Testing

### Using Postman

1. Import the API docs: `http://localhost:8001/docs`
2. Or manually create requests to `/webhook`
3. Save incident responses

### Using cURL

```bash
# POST incident
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d @incident_payload.json

# GET incidents
curl http://localhost:8001/incidents

# GET single incident
curl http://localhost:8001/incidents/550e8400-e29b-41d4-a716-446655440000
```

### Using Python

```python
import requests

# Send incident
response = requests.post(
    "http://localhost:8001/webhook",
    json={
        "incident_id": "test-001",
        "container_name": "buggy-app-v2",
        "alert_type": "Memory Leak",
        "severity": "CRITICAL",
        "logs": "ERROR: ...",
        "timestamp": "2024-02-21T03:15:00Z"
    }
)
print(response.json())

# Get status
status = requests.get(f"http://localhost:8001/incidents/{response.json()['incident_id']}")
print(status.json())
```

---

## Debugging & Troubleshooting

### Check AegisOps Core Logs

```bash
docker-compose logs aegis-agent -f --tail=100
```

### Check Buggy App Logs

```bash
docker-compose logs buggy-app-v2 -f --tail=100
```

### Verify Containers Are Connected

```bash
docker-compose ps
# All 3 should be running: buggy-app-v2, aegis-agent, aegis-dashboard
```

### Test Container-to-Container Communication

```bash
docker exec aegis-agent curl http://buggy-app-v2:8000/health
# Should return: {"status": "ok"}
```

---

## API Authentication (Future)

Current version has **no authentication**. In production, add:
- API Key authentication
- JWT tokens
- OAuth2 with Slack
- IP whitelisting

See `main.py` for hook points to add auth middleware.
