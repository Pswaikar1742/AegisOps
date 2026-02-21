Run these 3 commands in 3 separate terminal tabs right now:

---

**Terminal 1 — Live Agent Logs (shows every webhook, AI call, council vote, action)**
```bash
docker logs -f aegis-agent 2>&1
```

**Terminal 2 — Docker Stats (CPU/Memory live)**
```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

**Terminal 3 — Watch incidents being created and resolved in real time**
```bash
watch -n 2 'curl -s http://localhost:8001/incidents | python3 -m json.tool | grep -E "incident_id|status|action|root_cause|confidence" | head -60'
```

---

Now trigger an incident from the UI (click **Memory OOM** button) and watch:

- **Terminal 1** shows:
```
INFO: POST /webhook → RECEIVED
INFO: RAG retrieval → 2 similar past incidents found
INFO: Ollama analyzing logs...
INFO: AI Decision: RESTART (confidence=0.95)
INFO: Council voting: SRE=APPROVED Security=APPROVED Auditor=APPROVED
INFO: Executing RESTART on buggy-app-v2
INFO: Health check PASSED → RESOLVED
INFO: Runbook updated with new pattern
```

- **Terminal 2** shows `aegis-agent` CPU spike to **20-40%** during Ollama inference

- **Terminal 3** shows status changing:
```
RECEIVED → ANALYSING → COUNCIL_REVIEW → EXECUTING → RESOLVED
```

---

**Bonus — one-liner to see ALL backend traffic live:**
```bash
docker logs -f aegis-agent 2>&1 | grep --color=always -E "ERROR|CRITICAL|RESTART|RESOLVED|APPROVED|webhook|council|ollama|scale"
```

This gives you the **Screen 3** terminal view showing the backend actively working during your demo. 🎯