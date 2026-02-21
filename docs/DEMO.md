# 🎬 AegisOps Demo: Three-Screen Orchestrated Presentation

## Overview

This guide sets up **AegisOps** in a three-screen demonstration mode:

| Screen | Component | Purpose |
|--------|-----------|---------|
| **Screen 1** | React Cockpit UI (http://localhost:3000) | Real-time incident dashboard, AI analysis stream, council votes, metrics |
| **Screen 2** | VS Code + ai_brain.py | Code walkthrough: RAG logic, LLM prompts, confidence normalization, sanitization |
| **Screen 3** | Docker Stats Terminal | Live resource monitoring: CPU/Memory spikes, auto-scaling in action |

---

## Quick Start (One Command)

```bash
cd /home/psw/Projects/AegisOps
bash scripts/demo-setup.sh
```

**What this does:**
1. ✅ Checks Docker is running
2. ✅ Starts all services (docker-compose up)
3. ✅ Opens React Cockpit in browser (Screen 1)
4. ✅ Opens VS Code with ai_brain.py (Screen 2)
5. ✅ Opens terminal with docker stats (Screen 3)
6. ✅ Displays keyboard shortcuts and incident trigger guide

---

## Detailed Demo Flow

### Phase 1: Setup & Wait for Services (1-2 min)

**Terminal Output:**
```
✅ Docker is running
📦 Starting Docker Compose services...
✅ Docker Compose started

⏳ Waiting for React Cockpit...
✅ React Cockpit is ready!

⏳ Waiting for Agent...
✅ Agent is ready!
```

**What's happening:**
- All 5 containers starting: aegis-agent, aegis-cockpit, aegis-dashboard, aegis-lb, buggy-app-v2
- Health checks running in parallel
- Docker networks configured

**Duration:** ~30-60 seconds

---

### Phase 2: Three Screens Open (Automatically)

#### Screen 1: React Cockpit (Full Screen)
- **URL:** http://localhost:3000
- **Shows:**
  - 📊 Metrics: CPU, Memory, Requests/sec
  - 🗺️ Topology: Container relationships
  - ⚠️ Active Issues: Incident list
  - 🧠 AI Stream Panel: Live analysis logs
  - 🤝 Council Panel: SRE/Security/Auditor votes

#### Screen 2: VS Code + ai_brain.py
- **File:** `aegis_core/app/ai_brain.py`
- **Key sections to review:**
  - **Line ~40-70:** `Chat model + system prompt` (RAG-augmented instructions)
  - **Line ~150-200:** `async def analyze_logs()` (Main AI pipeline)
  - **Line ~276-298:** `def _sanitize_text()` (Spelling correction whitelist)
  - **Line ~300-330:** `RAG retrieval + ranking` (TF-IDF search on runbook.json)
  - **Line ~365-377:** `Confidence normalization` (Clamp to 0.0-1.0 range)

#### Screen 3: Docker Stats Terminal
- **Command:** `docker stats --all --no-trunc`
- **Columns:**
  - CONTAINER: Name of service
  - CPU%: CPU usage (watch spike during incident)
  - MEM USAGE: Memory in use
  - STATUS: Container state

**Before incident:** All containers idle (~1-5% CPU, stable memory)

---

### Phase 3: Trigger Demo Incidents

In a **new terminal**, run:

```bash
cd /home/psw/Projects/AegisOps
bash scripts/trigger-demo-incident.sh <scenario>
```

#### Available Scenarios

| Scenario | Event | Root Cause | Remediation |
|----------|-------|-----------|-------------|
| **network** | 95% packet loss on LB | Connection timeout | Restart LB container |
| **memory** | Memory leak (98% usage) | Unbounded allocation in loop | Restart app, scale up |
| **cpu** | CPU spike to 92% | Infinite loop in data processor | Optimize code, restart |
| **database** | Connection pool exhausted | Query timeout cascade | Scale replicas, restart |
| **disk** | 95% disk used (5% free) | Log bloat | Cleanup, alert ops |
| **all** | Cascade of all above | Multiple failures | Full system recovery |

#### Example: Network Incident

```bash
bash scripts/trigger-demo-incident.sh network
```

**Webhook sent:**
```json
{
  "incident_id": "DEMO-NET-1707982234",
  "title": "Network: 95% Packet Loss on Production LB",
  "severity": "critical",
  "logs": "Connection timeout on 10.0.1.5:443. Retransmit rate: 95%...",
  "metrics": {
    "cpu": 45,
    "memory": 78,
    "network_loss": 95,
    "requests_per_sec": 150
  }
}
```

---

### Phase 4: Watch Real-Time Incident Resolution

#### Timeline (60-90 seconds total)

**T+0s: Incident Received**
- Cockpit Screen: New incident appears in "Active Issues"
- Docker Stats: No change yet

**T+2s: AI Analysis Starts**
- Cockpit Screen: "AI Stream Panel" shows logs
  ```
  [ANALYZING] Processing logs...
  [RAG] Retrieved 2 similar past incidents (12.1%, 8.4% match)
  [LLM] Analyzing root cause...
  ```
- Docker Stats: `aegis-agent` CPU spikes to 20-30% (LLM processing)

**T+8s: Council Reviews**
- Cockpit Screen: Shows votes
  ```
  SRE:      ✅ APPROVED (95% confidence)
  Security: ✅ APPROVED (88% confidence)
  Auditor:  ✅ APPROVED (92% confidence)
  ```
- Docker Stats: Still elevated

**T+10s: Action Executes**
- Cockpit Screen: Incident status changes to "EXECUTING"
  ```
  Action: RESTART aegis-agent
  ```
- Docker Stats: Container restart (aegis-agent briefly shows 0% CPU)

**T+12s: Health Verification**
- Cockpit Screen: Health check logs
  ```
  [HEALTH] Container restart: SUCCESS
  [VERIFY] Service responding: ✅ YES
  [VERIFY] Metrics recovered: ✅ YES
  ```

**T+15s: Resolution Complete**
- Cockpit Screen: Incident status → "RESOLVED" ✅
- Docker Stats: All back to baseline
- Runbook: New entry added for RAG retrieval next time

---

## Code Walkthrough (While Watching)

### In VS Code (Screen 2): Follow the Execution

**Moment 1: Webhook arrives (T+0s)**
```python
# Line 77-85 in main.py
@app.post("/webhook")
async def webhook(payload: IncidentPayload):
    iid = payload.incident_id
    _timeline(result, "RECEIVED", f"Incident {iid} received", "API")
```

**Moment 2: RAG Retrieval (T+2s)**
```python
# Line ~300-330 in ai_brain.py
async def retrieve_similar_incidents():
    # TF-IDF search on runbook.json
    results = rag.search(payload.logs, top_k=3)
    ranked = rank_by_recency(results)  # Most recent first
    return ranked
```

**Moment 3: LLM Analysis (T+3-8s)**
```python
# Line 150-200 in ai_brain.py
async def analyze_logs(payload):
    # System prompt includes RAG context
    messages = [
        {"role": "system", "content": f"You are an SRE...recent incidents: {rag_context}"},
        {"role": "user", "content": payload.logs}
    ]
    response = await llm.stream(messages)
    
    # Parse response into Analysis model
    analysis = parse_analysis(response)
    
    # Line 365-377: Confidence normalization
    if analysis.confidence > 1:
        if analysis.confidence <= 100:
            analysis.confidence /= 100  # 95 → 0.95
        elif analysis.confidence <= 1000:
            analysis.confidence /= 1000  # 950 → 0.95
    analysis.confidence = max(0, min(1, analysis.confidence))  # Clamp
```

**Moment 4: Text Sanitization (T+8s)**
```python
# Line 276-298 in ai_brain.py
def _sanitize_text(text):
    replacements = {
        "Rot Cause": "Root Cause",
        "Justificatiin": "Justification",
        "NNtwork": "Network",
        # ... etc
    }
    for wrong, correct in replacements.items():
        text = text.replace(wrong, correct)
    return text

# Applied in analyze_logs:
analysis.root_cause = _sanitize_text(analysis.root_cause)
analysis.justification = _sanitize_text(analysis.justification)
```

**Moment 5: Council Review (T+9s)**
```python
# Line 170-210 in main.py
council_votes = await council_review(analysis)
# council_votes = {
#   "sre": {"vote": "APPROVE", "confidence": 0.95},
#   "security": {"vote": "APPROVE", "confidence": 0.88},
#   "auditor": {"vote": "APPROVE", "confidence": 0.92}
# }
```

**Moment 6: Action Execute (T+10s)**
```python
# Line 220-250 in main.py
if all_approved(council_votes):
    result.action_taken = await execute_action(analysis.action)
    # action = "RESTART" → docker restart aegis-agent
```

**Moment 7: Health Verify (T+12s)**
```python
# verification.py
async def verify_incident_resolved():
    health = await check_health()  # Polling
    metrics = await fetch_metrics()
    
    if health.status == "UP" and metrics.cpu < 70:
        return True  # ✅ Recovered
```

**Moment 8: Runbook Persist (T+15s)**
```python
# Line 310-330 in ai_brain.py
def persist_to_runbook(analysis):
    entry = {
        "timestamp": datetime.now(),
        "logs": original_logs,
        "root_cause": analysis.root_cause,
        "action": analysis.action,
        "justification": analysis.justification,
        "confidence": analysis.confidence,
        "outcome": "RESOLVED"
    }
    runbook.append(entry)
    # Saved to data/runbook.json for RAG next time
```

---

## Docker Stats Interpretation

### Before Incident
```
CONTAINER           CPU %   MEM USAGE
aegis-cockpit       0.2%    45.2MiB
aegis-agent         0.5%    120.3MiB
aegis-dashboard     0.1%    85.1MiB
aegis-lb            0.1%    22.5MiB
buggy-app-v2        0.3%    78.9MiB
```

### During Incident (Network scenario)
```
CONTAINER           CPU %   MEM USAGE
aegis-cockpit       0.3%    45.5MiB     ← Slightly elevated (UI updates)
aegis-agent         28.4%   185.2MiB    ← SPIKE! LLM processing
aegis-dashboard     0.2%    86.1MiB
aegis-lb            0.1%    22.5MiB
buggy-app-v2        45.2%   125.6MiB    ← Incident scenario running
```

### After Remediation
```
CONTAINER           CPU %   MEM USAGE
aegis-cockpit       0.2%    45.2MiB
aegis-agent         0.6%    121.1MiB    ← Back to baseline
aegis-dashboard     0.1%    85.2MiB
aegis-lb            0.1%    22.5MiB
buggy-app-v2        0.3%    79.1MiB     ← Scenario code halted
```

---

## Common Questions

### Q: Why does the Cockpit take time to load?
**A:** First-time Vite bundle is large (~600KB gzipped). Subsequent loads are instant (browser cache).

### Q: Can I see the LLM output?
**A:** Yes! In Cockpit's "AI Stream Panel", all logs are displayed in real-time. The LLM response is streamed as it's generated.

### Q: Why does aegis-agent CPU spike?
**A:** The LLM (running on local Ollama) processes the incident logs. This is CPU-intensive for 5-10 seconds.

### Q: Can I trigger multiple incidents?
**A:** Yes! Run `trigger-demo-incident.sh all` to see cascading failures and recovery.

### Q: How do I stop the demo?
**A:** Run: `docker-compose down`

---

## Advanced: Custom Incident

Create a `POST` to `/webhook` manually:

```bash
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "CUSTOM-001",
    "title": "Custom: Application error rate spike",
    "severity": "high",
    "logs": "Error rate: 45% (threshold: 5%). Timeout errors in payment service.",
    "metrics": {
      "error_rate": 45,
      "latency_p99_ms": 3500
    }
  }'
```

Watch Cockpit as it processes your custom incident!

---

## Files Created for This Demo

```
/home/psw/Projects/AegisOps/
├── docker-compose.demo.yml       ← Extended config with health checks
├── scripts/
│   ├── demo-setup.sh             ← Main orchestration (3 screens)
│   ├── trigger-demo-incident.sh  ← Incident trigger with 5 scenarios
│   └── (you are here: docs/DEMO.md)
├── docs/
│   ├── repo-overview.md          ← API reference
│   ├── DEMO.md                   ← This file
│   └── ...
└── aegis_core/
    ├── app/
    │   ├── ai_brain.py           ← RAG + LLM logic (main focus)
    │   ├── main.py               ← API + orchestration
    │   └── ...
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Docker not running"** | Start Docker: `sudo systemctl start docker` |
| **"Port 3000 already in use"** | Kill process: `lsof -i :3000 \| tail -1 \| awk '{print $2}' \| xargs kill -9` |
| **"Agent health check failing"** | Wait 30s, then retry. If persistent, check: `docker logs aegis-agent` |
| **"VS Code not opening"** | Install VS Code: `apt install code` (Ubuntu) or use `brew install visual-studio-code` (Mac) |
| **"No terminal opened"** | Manually run: `docker stats --all --no-trunc` in a new terminal |
| **"Incident not appearing"** | Check: `curl http://localhost:8001/incidents` to verify it was received |

---

## Recording the Demo

For presentations, record all three screens:

```bash
# Using ffmpeg (example for Screen 1 only)
ffmpeg -f x11grab -i :0 -f pulse -i default -c:v libx264 -preset fast \
  -c:a aac demo-recording.mp4

# Or use OBS (simpler, GUI-based)
# 1. Open OBS
# 2. Add 3 sources: Browser (Cockpit), VS Code window, Terminal window
# 3. Click "Start Recording"
# 4. Run: bash scripts/trigger-demo-incident.sh all
# 5. Let it run 5 minutes (full incident resolution cycle)
# 6. Stop recording
```

---

## Success Criteria

✅ **Demo is successful if:**

1. ✅ Cockpit loads without errors
2. ✅ Agent health endpoint responds
3. ✅ Incident webhook accepted and displayed in Cockpit
4. ✅ AI stream shows RAG retrieval + analysis + confidence
5. ✅ Council votes appear and reach consensus
6. ✅ Action executes (container restarts/scales)
7. ✅ Health verification passes
8. ✅ Incident marked "RESOLVED"
9. ✅ Docker stats shows CPU spike during analysis
10. ✅ Runbook persisted (visible in next demo run)

---

## Next Steps

After the demo, explore:

- 🧪 **Unit tests:** `pytest aegis_core/tests/` (create if doesn't exist)
- 🔧 **Customize AI prompts:** Edit system message in `ai_brain.py` line ~50
- 📊 **Add new metrics:** Extend incident payload in `models.py`
- 🚀 **Deploy to cloud:** See `docs/architecture.md` for Kubernetes setup
- 📈 **Performance tuning:** Profile LLM response time vs. incident complexity

---

**Ready? Run:** `bash scripts/demo-setup.sh`

**Questions?** Check `docs/repo-overview.md` or `CHANGES.md`.

Good luck! 🎬✨
