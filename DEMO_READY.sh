#!/usr/bin/env bash

# ╔════════════════════════════════════════════════════════════════════════════════╗
# ║     AegisOps - Three-Screen Demo Setup Complete! 🎬                           ║
# ║     Everything is now ready to showcase the system end-to-end                  ║
# ╚════════════════════════════════════════════════════════════════════════════════╝

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════════╗
║                   ✅ AegisOps Demo Setup - COMPLETE                           ║
║                                                                                ║
║              🎬 Three-Screen Orchestrated Demonstration Ready!                ║
╚════════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WHAT WAS CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Main Scripts (in scripts/ directory):
   • demo-setup.sh              - Orchestrator (opens all 3 screens automatically)
   • trigger-demo-incident.sh   - Incident trigger (5 scenario types)
   • demo-quickstart.sh         - Quick reference card (TL;DR guide)
   • scripts/README.md          - Complete documentation

✅ Configuration:
   • docker-compose.demo.yml    - Extended with health checks + labels

✅ Documentation:
   • docs/DEMO.md               - Detailed walkthrough (60-90s timeline, code refs)
   • CHANGES.md                 - Updated with demo info

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 HOW TO RUN THE DEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMAND 1: Start the demo (opens 3 screens automatically)

   $ cd /home/psw/Projects/AegisOps
   $ bash scripts/demo-setup.sh

   ✅ Screen 1: React Cockpit (http://localhost:3000) - Full Screen
   ✅ Screen 2: VS Code (ai_brain.py) - Code Walkthrough
   ✅ Screen 3: Docker Stats Terminal - Resource Monitoring

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMAND 2: Trigger an incident (in a NEW terminal)

   $ cd /home/psw/Projects/AegisOps
   $ bash scripts/trigger-demo-incident.sh network

   Scenarios available:
   • network   - 95% packet loss (network timeout)
   • cpu       - CPU spike to 92% (runaway loop)
   • memory    - Memory leak (98% usage)
   • database  - Connection pool exhaustion (100/100)
   • disk      - Disk space critical (95% used)
   • all       - Cascade of all incidents (3s delay between each)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 WHAT HAPPENS (REAL-TIME TIMELINE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you trigger an incident, watch this unfold:

   T+0s   : Webhook received
            ▶ Cockpit Screen: Incident appears in "Active Issues" list
            ▶ Docker Stats: No change yet

   T+1-2s : RAG retrieval starts
            ▶ Cockpit: "AI Stream Panel" shows "Searching runbook..."
            ▶ Agent CPU: Still baseline

   T+2-3s : LLM begins analysis
            ▶ Cockpit: Shows RAG matches (e.g., "12.1% match with past incident")
            ▶ Docker Stats: 🔴 aegis-agent CPU SPIKES to 20-30%
            ▶ VS Code: You can see ai_brain.py being executed

   T+5-8s : LLM generates response
            ▶ Cockpit: AI Stream shows incremental text (streaming)
            ▶ Shows root cause, recommended action, confidence level
            ▶ Docker Stats: Still spiking

   T+9s   : Council deliberates
            ▶ Cockpit: Council Panel shows 3 votes:
               • SRE Analyst: ✅ APPROVED (95% confidence)
               • Security: ✅ APPROVED (88% confidence)
               • Auditor: ✅ APPROVED (92% confidence)

   T+10s  : Action executes
            ▶ Cockpit: Status changes to "EXECUTING"
            ▶ Shows action: "RESTART aegis-agent"
            ▶ Docker Stats: Container restarts (brief drop to 0% CPU)

   T+11-12s : Health verification
            ▶ Cockpit: Shows "Verifying container health..."
            ▶ Container comes back online
            ▶ Health checks pass

   T+13-15s: Incident resolved
            ▶ Cockpit: Status → "RESOLVED" ✅
            ▶ Duration displayed: "Resolved in 14.2 seconds"
            ▶ Runbook updated with new entry
            ▶ Docker Stats: Back to baseline

   🎯 Total Time: 60-90 seconds for full end-to-end incident lifecycle!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 CODE WALKTHROUGH (Screen 2: VS Code)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

While watching the demo, follow the code in VS Code:

   File: aegis_core/app/ai_brain.py

   Line ~40-70
   ├─ Chat model initialization
   ├─ System prompt (RAG-augmented with runbook context)
   └─ Temperature/max_tokens tuning

   Line ~150-200
   ├─ async def analyze_logs()
   ├─ Main entry point for AI analysis
   └─ Orchestrates RAG → LLM → parsing → sanitization

   Line ~276-298
   ├─ def _sanitize_text()
   ├─ Whitelist replacements (e.g., "Rot Cause" → "Root Cause")
   └─ Called on root_cause and justification fields

   Line ~300-330
   ├─ RAG retrieval + ranking
   ├─ TF-IDF search on runbook.json
   └─ Recent matches ranked first

   Line ~365-377
   ├─ Confidence normalization
   ├─ If conf > 1: divide by 100 or 1000
   └─ Clamp to [0.0, 1.0] range

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 DOCKER STATS INTERPRETATION (Screen 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Column: CPU %
   Before: 0.3-0.5% per container (idle)
   During: 🔴 aegis-agent jumps to 20-30% (LLM thinking hard)
   After:  0.3-0.5% per container (back to idle)

Column: MEM USAGE
   Before: ~120MiB (aegis-agent)
   During: ~140MiB (increased context window during LLM)
   After:  ~120MiB (released)

Column: STATUS
   Normal: "Up X seconds"
   During restart: "Restarting" for ~2 seconds
   After: "Up X seconds" (restarted time resets)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 ACCESS POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Screen 1: React Cockpit
   • URL: http://localhost:3000
   • Shows: Incidents, metrics, topology, AI stream, council votes

Agent API (for manual testing)
   • URL: http://localhost:8001
   • Health: http://localhost:8001/health
   • Incidents: http://localhost:8001/incidents
   • Webhook: POST http://localhost:8001/webhook

Dashboard (Streamlit)
   • URL: http://localhost:8501
   • Alternative view of incidents

Load Balancer (nginx)
   • URL: http://localhost:80
   • Routes to buggy-app-v2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DEMO SUCCESS CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check these to confirm the demo is working:

   ✅ Cockpit loads at http://localhost:3000 (no errors)
   ✅ Agent responds to health check: curl http://localhost:8001/health
   ✅ Incident webhook accepted (Status 200)
   ✅ Incident appears in Cockpit within 1 second
   ✅ AI Stream shows RAG retrieval logs
   ✅ Confidence shown as percentage (0-100%)
   ✅ Council votes appear and reach consensus
   ✅ Action executes (container restarts or scales)
   ✅ Docker stats shows CPU spike during LLM processing
   ✅ Incident status changes to "RESOLVED" ✅
   ✅ Runbook file updated: cat aegis_core/data/runbook.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For more information, see:

   📄 docs/DEMO.md
      • Detailed walkthrough with code references
      • Phase-by-phase explanation
      • Troubleshooting guide
      • Custom incident examples

   📄 docs/repo-overview.md
      • Full API reference
      • WebSocket frame types
      • 6-step QA checklist
      • Architecture diagram

   📄 scripts/README.md
      • Script documentation
      • Usage examples
      • Performance metrics

   📄 CHANGES.md
      • Latest UI/UX improvements
      • QA checklist for fixes
      • Local dev setup guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 COMMON ISSUES & FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Docker not running"
   → Start Docker: sudo systemctl start docker

❌ "Port 3000 already in use"
   → Kill process: lsof -i :3000 | tail -1 | awk '{print $2}' | xargs kill -9

❌ "Agent health check failing"
   → Wait 30s and retry. Check logs: docker logs aegis-agent

❌ "Cockpit not loading"
   → Verify: curl http://localhost:3000/

❌ "Incident not appearing"
   → Check: curl http://localhost:8001/incidents | jq

❌ "VS Code not opening"
   → Install: apt install code (Ubuntu) or brew install visual-studio-code (Mac)
   → Or manually open: code aegis_core/app/ai_brain.py

❌ "Docker stats terminal not opening"
   → Manually run: docker stats --all --no-trunc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIPS FOR A GREAT DEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Arrange windows before starting:
   • Left 1/3: Cockpit (fullscreen would be better)
   • Middle 1/3: VS Code with ai_brain.py
   • Right 1/3: Docker stats terminal

2. Use a projector or large screen for better visibility

3. Increase font sizes:
   • VS Code: Settings → Font Size: 16 or 18
   • Terminal: Right-click → Preferences → Font: 14+
   • Browser: Ctrl/Cmd + + to zoom

4. Pre-record for presentation (OBS or ffmpeg)

5. Pause between screens to explain each section

6. Run `all` scenario for maximum impact (5 incidents cascade)

7. Toggle VS Code breakpoints to pause execution:
   • Click left margin next to line number (F9 to toggle)
   • Useful for explaining specific code sections

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 READY TO START?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ cd /home/psw/Projects/AegisOps
$ bash scripts/demo-setup.sh

This single command will:
   ✅ Check Docker
   ✅ Start all services
   ✅ Open Cockpit in browser (Screen 1)
   ✅ Open VS Code (Screen 2)
   ✅ Open docker stats terminal (Screen 3)
   ✅ Display guide

Then in a NEW terminal:
   $ bash scripts/trigger-demo-incident.sh network

And watch the entire incident resolution unfold in 60-90 seconds!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Git Commit: 516ee4a
Files: 7 new files, 1580 insertions

Enjoy the demo! 🚀

EOF
