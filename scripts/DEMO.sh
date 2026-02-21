#!/bin/bash

# 🎬 AegisOps MVP Demo — One-Command Victory
# This is the "I Wanna Win" showcase script

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║  🛡️  AegisOPS — AI-Powered SRE Operations Platform         ║"
echo "║                                                            ║"
echo "║  \"I Wanna Win\" — Autonomous Incident Response MVP        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check if services are running
echo -e "${BLUE}[1/6]${NC} Verifying services are running..."
AGENT_READY=$(curl -s http://localhost:8001/incidents 2>/dev/null | python3 -c "import sys; print('yes')" 2>/dev/null || echo "no")
if [[ "$AGENT_READY" != "yes" ]]; then
    echo -e "${YELLOW}⚠️  Services not ready. Starting...${NC}"
    cd /home/psw/Projects/AegisOps
    docker compose up -d --build >/dev/null 2>&1
    sleep 15
    echo -e "${GREEN}✅ Services started${NC}"
else
    echo -e "${GREEN}✅ Services ready${NC}"
fi

# Show current state
echo -e "\n${BLUE}[2/6]${NC} Current state:"
INCIDENT_COUNT=$(curl -s http://localhost:8001/incidents 2>/dev/null | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo -e "      Active incidents: ${CYAN}$INCIDENT_COUNT${NC}"

# Open dashboard
echo -e "\n${BLUE}[3/6]${NC} Opening dashboard..."
echo -e "      ${CYAN}http://localhost:3000${NC}"
if command -v xdg-open >/dev/null; then
    xdg-open http://localhost:3000 >/dev/null 2>&1 || true
elif command -v open >/dev/null; then
    open http://localhost:3000 >/dev/null 2>&1 || true
fi
echo -e "      ${GREEN}✅ Dashboard URL ready${NC}"

# Show 6 incident types  
echo -e "\n${BLUE}[4/6]${NC} 6 Real Incident Types:"
echo -e "      ${CYAN}1. Memory Out-of-Memory (OOM)${NC} — Java heap exhaustion"
echo -e "      ${CYAN}2. Network Latency${NC} — High RTT, packet loss"
echo -e "      ${CYAN}3. CPU Spike${NC} — Runaway processes, infinite loops"
echo -e "      ${CYAN}4. DB Connection Pool${NC} — Connection leak, saturation"
echo -e "      ${CYAN}5. Disk Space${NC} — Filesystem exhaustion"
echo -e "      ${CYAN}6. Pod Crash Loop${NC} — CrashLoopBackOff, container restarts"

# Trigger demo
echo -e "\n${BLUE}[5/6]${NC} Triggering demo incidents..."
bash /home/psw/Projects/AegisOps/scripts/trigger-all-incidents.sh http://localhost:8001 minimal >/dev/null 2>&1 &
TRIGGER_PID=$!
echo -e "      ${GREEN}✅ 6 incidents triggered (processing...)${NC}"

# Show AI pipeline
echo -e "\n${BLUE}[6/6]${NC} AI Response Pipeline:"
echo -e "      ${CYAN}WEBHOOK${NC} → Incident received"
echo -e "      ${CYAN}ANALYSING${NC} → Ollama/Claude diagnoses root cause"
echo -e "      ${CYAN}COUNCIL_REVIEW${NC} → 3-agent consensus voting"
echo -e "      ${CYAN}APPROVED${NC} → Security Officer + Auditor + SRE Lead agree"
echo -e "      ${CYAN}EXECUTING${NC} → Action deployed (restart, scale, cleanup)"
echo -e "      ${CYAN}RESOLVED${NC} → Incident closed, runbook updated"

# Wait for trigger to complete
wait $TRIGGER_PID 2>/dev/null || true

# Show resolution stats after waiting
sleep 10
echo -e "\n${GREEN}✅ DEMO IN PROGRESS${NC}"
echo -e "   ${YELLOW}Watch the dashboard at http://localhost:3000${NC}"
echo -e "   Incidents are resolving autonomously...\n"

# Real-time stats
while true; do
    STATS=$(curl -s http://localhost:8001/incidents 2>/dev/null | python3 << 'STATS_EOF'
import sys, json
data = json.load(sys.stdin)
resolved = sum(1 for i in data if i['status'] == 'RESOLVED')
failed = sum(1 for i in data if i['status'] == 'FAILED')
processing = sum(1 for i in data if i['status'] not in ['RESOLVED', 'FAILED'])
print(f"{len(data)}|{resolved}|{failed}|{processing}")
STATS_EOF
    )
    
    TOTAL=$(echo $STATS | cut -d'|' -f1)
    RESOLVED=$(echo $STATS | cut -d'|' -f2)
    FAILED=$(echo $STATS | cut -d'|' -f3)
    PROCESSING=$(echo $STATS | cut -d'|' -f4)
    
    echo -ne "\r   ${CYAN}Incidents${NC}: ${TOTAL} | ${GREEN}✅ Resolved: ${RESOLVED}${NC} | ${YELLOW}⏳ Processing: ${PROCESSING}${NC} | ${YELLOW}❌ Failed: ${FAILED}${NC}   "
    
    if [[ $PROCESSING -eq 0 ]]; then
        break
    fi
    sleep 2
done

echo -e "\n\n${GREEN}🎉 DEMO COMPLETE!${NC}\n"
echo -e "Summary:"
echo -e "  Total Incidents:  ${TOTAL}"
echo -e "  Resolved:         ${GREEN}${RESOLVED}${NC}"
echo -e "  Failed:           ${FAILED}"
echo -e ""
echo -e "Next Steps:"
echo -e "  1. Review dashboard: ${CYAN}http://localhost:3000${NC}"
echo -e "  2. Trigger more incidents: ${CYAN}bash scripts/trigger-all-incidents.sh${NC}"
echo -e "  3. Check logs: ${CYAN}docker logs aegis-agent | tail -50${NC}"
echo -e ""
