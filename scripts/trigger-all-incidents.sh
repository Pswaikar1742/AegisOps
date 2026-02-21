#!/bin/bash

# Enhanced Demo Incident Trigger Script
# Triggers 5+ distinct incident types for the AegisOps demo

set -e

AGENT_URL="${1:-http://localhost:8001}"
DEMO_MODE="${2:-demo}"  # Can be "stress" to trigger all at once

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

incident_count=0

# Function to trigger incident
trigger_incident() {
    local alert_type=$1
    local message=$2
    local severity=$3
    
    incident_count=$((incident_count + 1))
    
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Triggering: ${message}"
    
    curl -s -X POST "${AGENT_URL}/webhook" \
        -H "Content-Type: application/json" \
        -d @- <<EOF | python3 -m json.tool 2>/dev/null || true
{
    "incident_id": "INC-$(date +%s%N | md5sum | cut -c1-8 | tr a-z A-Z)",
    "alert_type": "${alert_type}",
    "severity": "${severity}",
    "source": "prometheus",
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "details": {
        "service": "buggy-app-v2",
        "pod": "buggy-app-v2-$(printf '%05d' $RANDOM)",
        "namespace": "production",
        "message": "${message}"
    }
}
EOF
    
    sleep 1
}

# ====================
# INCIDENT TYPE 1: Memory OOM
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 1: Memory Out-of-Memory (OOM)${NC}"
    trigger_incident "memory_oom" \
        "Container memory usage exceeded threshold: 96% (Heap space exhaustion detected in Java process)" \
        "critical"
    sleep 2
fi

# ====================
# INCIDENT TYPE 2: Network Latency
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 2: Network Latency${NC}"
    trigger_incident "network_latency" \
        "High network latency detected: 450ms avg round-trip time (expected <50ms)" \
        "high"
    sleep 2
fi

# ====================
# INCIDENT TYPE 3: CPU Spike
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 3: CPU Spike${NC}"
    trigger_incident "cpu_spike" \
        "CPU usage spike detected: 92% utilization for 5+ minutes (runaway query or infinite loop)" \
        "high"
    sleep 2
fi

# ====================
# INCIDENT TYPE 4: Database Connection Pool Saturation
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 4: Database Connection Pool Saturation${NC}"
    trigger_incident "db_connection" \
        "Database connection pool saturation: 95/100 active connections (connection leak suspected)" \
        "high"
    sleep 2
fi

# ====================
# INCIDENT TYPE 5: Disk Space Exhaustion
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 5: Disk Space Exhaustion${NC}"
    trigger_incident "disk_space" \
        "Disk space critical: 98% full (/var/log filling up with application logs)" \
        "critical"
    sleep 2
fi

# ====================
# INCIDENT TYPE 6: Pod Crash Loop
# ====================
if [[ "$DEMO_MODE" != "minimal" ]]; then
    echo -e "\n${YELLOW}▶ INCIDENT TYPE 6: Pod Crash Loop${NC}"
    trigger_incident "pod_crash" \
        "Pod crash loop detected: 5 restarts in 10 minutes (CrashLoopBackOff)" \
        "critical"
    sleep 2
fi

# ====================
# Summary
# ====================
echo -e "\n${GREEN}✅ Triggered $incident_count incidents for demo${NC}"
echo -e "${BLUE}Open http://localhost:3000 to see the Cockpit UI in action${NC}"

# Wait and show resolution status
if [[ "$DEMO_MODE" == "demo" ]]; then
    echo -e "\n${YELLOW}Waiting 30 seconds for incidents to resolve...${NC}"
    sleep 30
    
    echo -e "\n${BLUE}Recent incidents:${NC}"
    curl -s "${AGENT_URL}/incidents" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for inc in data[:5]:
    print(f\"  [{inc['status']}] {inc['incident_id']} - {inc['alert_type']} (Confidence: {inc['analysis'].get('confidence', 0)*100:.0f}%)\")
" 2>/dev/null || echo "  (Could not fetch incidents)"
fi
