# 🎬 AegisOps Demo Scripts

Orchestration scripts for the three-screen AegisOps demonstration.

## Quick Start

```bash
# One command to set up everything:
bash demo-setup.sh
```

This automatically:
1. ✅ Starts all Docker services
2. ✅ Opens React Cockpit (Screen 1)
3. ✅ Opens VS Code with ai_brain.py (Screen 2)
4. ✅ Opens docker stats terminal (Screen 3)
5. ✅ Displays incident trigger guide

## Scripts

### `demo-setup.sh` - Main Orchestrator
**Purpose:** Set up the three-screen demo environment

**Features:**
- Checks Docker installation
- Starts docker-compose services
- Waits for health checks
- Opens all three screens automatically
- Provides keyboard navigation guide

**Usage:**
```bash
bash demo-setup.sh
```

### `trigger-demo-incident.sh` - Incident Trigger
**Purpose:** Send incidents to the agent to trigger AI analysis

**Usage:**
```bash
bash trigger-demo-incident.sh <scenario> [severity]
```

**Scenarios:**
- `network` - Network connectivity issue (95% packet loss)
- `memory` - Memory leak in container (98% usage)
- `cpu` - CPU spike / runaway process (92% CPU)
- `database` - Connection pool exhaustion (100/100 connections)
- `disk` - Disk space critical (95% used)
- `all` - Trigger all scenarios sequentially

**Examples:**
```bash
# Simple network incident
bash trigger-demo-incident.sh network

# High severity CPU spike
bash trigger-demo-incident.sh cpu critical

# Cascade of all incidents
bash trigger-demo-incident.sh all
```

### `demo-quickstart.sh` - Quick Reference Card
**Purpose:** Display TL;DR guide for the demo

**Usage:**
```bash
bash demo-quickstart.sh
```

**Shows:**
- Quick start commands
- Timeline of what to expect
- URLs for each service
- Common troubleshooting

## Screens Overview

| Screen | Component | URL | Purpose |
|--------|-----------|-----|---------|
| **1** | React Cockpit | http://localhost:3000 | Real-time dashboard with incidents, metrics, AI stream |
| **2** | VS Code | - | Code walkthrough: ai_brain.py RAG/LLM/sanitizer logic |
| **3** | Docker Stats | Terminal | Monitor CPU/Memory spikes during incident resolution |

## Demo Flow

```
1. Run demo-setup.sh
   ↓
2. Cockpit loads, services healthy
   ↓
3. Run trigger-demo-incident.sh network (in new terminal)
   ↓
4. Watch Cockpit: incident appears
   ↓
5. Watch Docker Stats: aegis-agent CPU spikes (LLM processing)
   ↓
6. Review Code: ai_brain.py highlights RAG/LLM/council logic
   ↓
7. Wait 60-90 seconds for full resolution
   ↓
8. Incident marked RESOLVED, runbook updated
```

## Environment

All scripts assume:
- Docker is installed and running
- Port 3000 (Cockpit), 8001 (Agent), 8501 (Dashboard) are available
- VS Code is installed (optional, for Screen 2)
- A terminal emulator is available (gnome-terminal, konsole, xterm, etc.)

## Troubleshooting

### "Docker not running"
```bash
sudo systemctl start docker
```

### "Port 3000 already in use"
```bash
lsof -i :3000 | tail -1 | awk '{print $2}' | xargs kill -9
```

### "Agent not responding"
```bash
docker logs -f aegis-agent
```

### "Incident not appearing"
```bash
curl http://localhost:8001/incidents | jq
```

### "VS Code not opening"
Install VS Code or manually open:
```bash
code aegis_core/app/ai_brain.py
```

## Documentation

- **docs/DEMO.md** - Detailed walkthrough with timeline and code references
- **docs/repo-overview.md** - Full API reference and architecture
- **CHANGES.md** - Latest UI/UX improvements
- **LOCAL_DEV.md** - Local development without Docker rebuilds

## Files Created

```
scripts/
├── demo-setup.sh              ← Main orchestrator (run this first!)
├── trigger-demo-incident.sh   ← Send incidents to trigger AI
├── demo-quickstart.sh         ← Quick reference card
└── README.md                  ← This file

Alongside:
├── docker-compose.demo.yml    ← Extended config with health checks
├── docs/DEMO.md               ← Detailed demo guide
└── CHANGES.md                 ← Updated with demo info
```

## Performance

- **Setup time:** 30-60 seconds (docker-compose + health checks)
- **Incident resolution:** 60-90 seconds (RAG retrieval + LLM + council + action)
- **LLM processing:** 5-10 seconds (visible CPU spike in docker stats)
- **Health verification:** 2-3 seconds

## Success Criteria

✅ Demo is successful if:
1. Cockpit loads and is responsive
2. Agent health endpoint responds
3. Incident webhook accepted
4. AI stream shows RAG + LLM + confidence
5. Council votes reach consensus
6. Action executes (container restarts)
7. Health verification passes
8. Incident marked RESOLVED
9. Docker stats shows CPU spike
10. Runbook persisted

## Next Steps

After the demo:
- Review code in Screen 2 (ai_brain.py)
- Check docker logs for detailed trace
- Test with custom incidents
- Modify AI prompts for different responses
- Explore RAG retrieval in runbook.json

## Support

For issues or questions:
1. Check `docs/DEMO.md` detailed walkthrough
2. Review `docs/repo-overview.md` API reference
3. Check `CHANGES.md` for recent fixes
4. Run `docker logs <service>` for debug output

---

**Ready?** Run: `bash demo-setup.sh`
