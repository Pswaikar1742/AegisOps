# AegisOps — GOD MODE

Report: Google AI Studio import — RAG-enabled SRE Agent

Generated: 2026-02-21

## Executive Summary

- Project: AegisOps — "GOD MODE" autonomous SRE agent
- Purpose: Real-time SRE cockpit, multi-agent governance, and automated remediation with recursive RAG learning
- This report summarizes architecture changes (TF-IDF RAG), verification results, and reproduction steps for Google AI Studio ingestion.

## Highlights

- Implemented local RAG (Retrieval-Augmented Generation) using TF-IDF + cosine similarity (no external embedding API calls).
- Runbook (data/runbook.json) stores resolved incidents with full logs, root_cause, action, justification, confidence, container_name, and severity.
- `ai_brain.py` now retrieves Top-2 similar past incidents and injects them into the SRE system prompt for better diagnosis.
- Demonstrated recursive learning: seed incident → saved → similar incident retrieves runbook entry → improved diagnosis.
- End-to-end validated with live Docker Compose stack including cockpit (React), agent (FastAPI), nginx LB, buggy app, and streamlit dashboard.

## Architecture (short)

- FastAPI agent (`aegis-agent`) — core pipeline and WebSocket for the cockpit
- React cockpit (`aegis-cockpit`) — real-time UI with WebSocket streams
- Nginx load balancer (`aegis-lb`) — upstream reconfiguration for dynamic replicas
- Buggy target app (`buggy-app-v2`) — triggers (CPU, memory, db latency)
- Streamlit dashboard (`aegis-dashboard`) — metrics / visualization

RAG loop:

1. Incident received at `/webhook` (FastAPI)
2. `get_relevant_runbook_entries()` (TF-IDF) finds top-2 similar runbook entries
3. System prompt augmented with runbook context → LLM analysis
4. Multi-Agent Council (SRE, Security, Auditor) reviews the recommended action
5. Execute (restart/scale) → verify → append to runbook.json

## Files changed / added (key)

- `aegis_core/app/ai_brain.py` — RAG logic (TF-IDF retrieval, system prompt injection)
- `aegis_core/app/verification.py` — runbook saving with full logs & metadata
- `aegis_core/app/models.py` — `RunbookEntry` enriched for RAG fields
- `aegis_core/requirements.txt` — added `numpy`, `scikit-learn`
- `aegis_core/app/main.py` — `/runbook` and `/rag/test` endpoints and RAG timeline step

## How RAG works (implementation notes)

- Uses `sklearn.feature_extraction.text.TfidfVectorizer` with stop words, unigrams+bigrams, and sublinear TF.
- The runbook entries are concatenated (logs + alert_type + root_cause + action + justification + container + severity) into a single document for each entry.
- The query (current logs) is added to the same TF-IDF space; cosine similarity between query and each corpus entry is computed.
- Top-K (K=2) entries above a similarity threshold (default 0.05) are returned and formatted into a runbook knowledge block injected into the LLM system prompt.

## Reproduction / Run instructions (local)

Prerequisites: Docker, docker-compose, ports 80/3000/8000/8001/8501 free.

1. Build images (first run may take longer):

```bash
cd /home/psw/Projects/AegisOps
docker compose build --no-cache aegis-agent aegis-cockpit aegis-dashboard aegis-lb buggy-app-v2
```

2. Start the stack:

```bash
docker compose up -d
```

3. Verify services (example):

```bash
curl http://localhost:8001/health   # agent
curl http://localhost:8000/health   # buggy app
http://localhost:3000                # cockpit UI
http://localhost:80/lb-health        # LB
```

4. Seed runbook (example):

```bash
curl -X POST http://localhost:8001/webhook -H 'Content-Type: application/json' -d '{
  "incident_id": "RAG-SEED-001",
  "container_name": "buggy-app-v2",
  "alert_type": "Memory Leak",
  "severity": "CRITICAL",
  "logs": "Memory usage at 92.4%. Heap allocation growing unbounded...",
  "timestamp": "2026-02-21T13:00:00Z"
}'
```

5. Test RAG retrieval (quick):

```bash
curl 'http://localhost:8001/rag/test?logs=Memory+usage+high+OOM+killer+heap+growing'
```

6. Inspect runbook:

```bash
curl http://localhost:8001/runbook | jq .
```

## Evidence & Verification (what I ran)

- Built and started full 5-service stack locally.
- Seeded `RAG-SEED-001` (memory leak) and verified it was saved to `data/runbook.json` via `/runbook`.
- Fired `RAG-TEST-002` (similar memory leak): agent logged `📚 RAG: Retrieved 1 similar past incidents (best match: 25.7%)` and the LLM justification referenced "matches past incident pattern".
- Verified the timeline events stream to the cockpit WebSocket and Slack notifications were sent.

## Google AI Studio delivery notes

Options for importing this report into Google AI Studio:

1. Upload this Markdown as a text asset in AI Studio. Use the report content and attach `data/runbook.json` as an artifact.
2. Convert Markdown to a notebook (if you prefer an executable narrative):

```bash
# Install jupytext or pandoc (if needed)
# Convert markdown -> ipynb (pandoc) or use jupytext
# Example with jupytext:
pip install jupytext
jupytext --to notebook reports/god-mode-aistudio-report.md -o reports/god-mode-aistudio-report.ipynb
```

3. Include artifacts in the AI Studio project: `aegis_core/app/`, `data/runbook.json`, `docker-compose.yml` for reproducibility.

## Next steps / Recommendations

- Persist `data/` outside ephemeral containers (bind mount) so runbook survives container rebuilds.
- Periodically compact runbook (archival) or index with incremental vector store if corpus grows large.
- Add lightweight tests for RAG (unit test: two similar logs → similarity above threshold).
- Consider a small local vector index (faiss) for scale if runbook > 10k entries.

## Contact / Artifacts

- Repo: (local workspace) `/home/psw/Projects/AegisOps`
- Report file: `reports/god-mode-aistudio-report.md`
- Runbook: `data/runbook.json`
- Key scripts: `docker-compose.yml`, `aegis_core/app/ai_brain.py`, `aegis_core/app/verification.py`

----
Generated by the AegisOps automation on 2026-02-21.
