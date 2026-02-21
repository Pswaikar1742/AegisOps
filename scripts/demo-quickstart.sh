#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════════╗
# ║     AegisOps Demo - Quick Start Card (TL;DR)                                  ║
# ╚════════════════════════════════════════════════════════════════════════════════╝

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════════╗
║                    🎬 AegisOps Demo - QUICK START                             ║
╚════════════════════════════════════════════════════════════════════════════════╝

┌─ Step 1: Start Demo (Opens 3 screens automatically) ─────────────────────────┐
│                                                                               │
│   $ cd /home/psw/Projects/AegisOps                                           │
│   $ bash scripts/demo-setup.sh                                              │
│                                                                               │
│   ✅ Screen 1: React Cockpit opens (http://localhost:3000)                  │
│   ✅ Screen 2: VS Code opens (ai_brain.py for code review)                  │
│   ✅ Screen 3: Docker Stats terminal opens (watch CPU spikes)               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ Step 2: Trigger Incident (in a NEW terminal) ──────────────────────────────┐
│                                                                               │
│   $ cd /home/psw/Projects/AegisOps                                           │
│   $ bash scripts/trigger-demo-incident.sh network                           │
│                                                                               │
│   Options: network | cpu | memory | database | disk | all                   │
│                                                                               │
│   ⏱️  Watch for 60-90 seconds:                                              │
│   • Cockpit shows incident + AI analysis stream                             │
│   • Docker stats shows CPU spike during LLM processing                      │
│   • Council votes appear and approve action                                 │
│   • Container restarts automatically                                         │
│   • Incident marked RESOLVED ✅                                             │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ Step 3: Code Walkthrough (VS Code - Screen 2) ──────────────────────────────┐
│                                                                               │
│   File: aegis_core/app/ai_brain.py                                          │
│                                                                               │
│   Line ~40-70   : Chat model + system prompt (RAG-augmented)               │
│   Line ~150     : analyze_logs() - main AI pipeline                        │
│   Line ~276-298 : _sanitize_text() - spelling correction                  │
│   Line ~300-330 : RAG retrieval + TF-IDF ranking                          │
│   Line ~365-377 : Confidence normalization (clamp to 0.0-1.0)             │
│                                                                               │
│   👉 Toggle breakpoint (F9) and step through execution!                    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ Step 4: Monitor (Docker Stats - Screen 3) ────────────────────────────────┐
│                                                                               │
│   Watch CPU % column:                                                        │
│   • Before: 0.3-0.5% per container                                         │
│   • During: aegis-agent spikes to 20-30% (LLM thinking)                   │
│   • After:  Back to baseline (incident resolved)                           │
│                                                                               │
│   Watch MEM USAGE column:                                                    │
│   • Stable during normal operation                                          │
│   • Slight increase during LLM processing (context window)                 │
│   • Returns to baseline after incident                                      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ URLs & Access Points ─────────────────────────────────────────────────────────┐
│                                                                                 │
│   🌐 Cockpit (Main UI)          : http://localhost:3000                       │
│   🤖 Agent API                  : http://localhost:8001                       │
│   📊 Dashboard (Streamlit)      : http://localhost:8501                       │
│   🔄 Load Balancer (Nginx)      : http://localhost:80                        │
│   📋 Runbook (JSON)             : aegis_core/data/runbook.json                │
│   📝 RAG Knowledge Base         : aegis_core/data/runbook.json                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─ Incident Timeline (Watch this happen in real-time) ──────────────────────────┐
│                                                                                 │
│   T+0s    : Incident received → Appears in Cockpit "Active Issues"             │
│   T+2s    : AI Stream shows "Analyzing..." + RAG retrieval                     │
│   T+3-8s  : LLM processing (aegis-agent CPU spikes to 20-30%)                 │
│   T+9s    : Council shows votes (SRE ✅ Security ✅ Auditor ✅)                │
│   T+10s   : Action executes ("RESTART aegis-agent")                           │
│   T+12s   : Health checks pass, container responsive                          │
│   T+15s   : Incident status → RESOLVED ✅ Runbook updated                     │
│                                                                                 │
│   🎯 Total time: 60-90 seconds for full incident lifecycle!                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─ Common Actions ───────────────────────────────────────────────────────────────┐
│                                                                                 │
│   Restart all services:                                                        │
│   $ docker-compose down && docker-compose up -d                              │
│                                                                                 │
│   View agent logs (live):                                                      │
│   $ docker logs -f aegis-agent                                               │
│                                                                                 │
│   Check current incidents:                                                     │
│   $ curl http://localhost:8001/incidents | jq                                │
│                                                                                 │
│   View runbook (past incidents):                                              │
│   $ cat aegis_core/data/runbook.json | jq                                    │
│                                                                                 │
│   Test RAG retrieval:                                                          │
│   $ curl -X POST http://localhost:8001/rag/test \                            │
│     -d '{"query": "network timeout"}' -H "Content-Type: application/json"   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─ Key Files to Understand ──────────────────────────────────────────────────────┐
│                                                                                 │
│   📄 aegis_core/app/ai_brain.py       - Core AI logic (RAG + LLM + sanitizer) │
│   📄 aegis_core/app/main.py           - API endpoints + orchestration         │
│   📄 aegis_cockpit/src/components/... - Frontend UI components                │
│   📄 aegis_core/data/runbook.json     - RAG knowledge base (grows over time)  │
│   📄 docs/repo-overview.md            - Full API reference                    │
│   📄 docs/DEMO.md                     - Detailed walkthrough (this guide)      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─ Troubleshooting ──────────────────────────────────────────────────────────────┐
│                                                                                 │
│   ❌ Agent unhealthy?                                                          │
│   $ docker logs aegis-agent | tail -50                                       │
│                                                                                 │
│   ❌ Cockpit not loading?                                                      │
│   $ curl http://localhost:3000/                                              │
│                                                                                 │
│   ❌ Incident not appearing?                                                   │
│   $ curl http://localhost:8001/incidents                                     │
│                                                                                 │
│   ❌ Docker stats not opening?                                                 │
│   Manually run: docker stats --all --no-trunc                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

🎬 READY? Run: bash scripts/demo-setup.sh

For detailed guide: docs/DEMO.md
For API reference: docs/repo-overview.md
For code changes: CHANGES.md

EOF
