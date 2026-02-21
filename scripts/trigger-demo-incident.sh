#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════════╗
# ║     AegisOps Demo - Incident Trigger                                          ║
# ║     Send webhook events to trigger SRE AI analysis                            ║
# ╚════════════════════════════════════════════════════════════════════════════════╝

set -e

AGENT_URL="http://localhost:8001"
WEBHOOK_ENDPOINT="/webhook"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ===== Function: Check agent health =====
check_agent_health() {
    echo -ne "${YELLOW}⏳ Checking agent health...${NC}"
    
    if ! curl -sf "${AGENT_URL}/health" >/dev/null 2>&1; then
        echo -e "\r${RED}❌ Agent not responding at ${AGENT_URL}${NC}"
        echo -e "${YELLOW}   Start with: cd /home/psw/Projects/AegisOps && docker-compose up -d${NC}"
        exit 1
    fi
    echo -e "\r${GREEN}✅ Agent healthy${NC}\n"
}

# ===== Function: Trigger incident =====
trigger_incident() {
    local scenario=$1
    local severity=${2:-"high"}
    
    case "$scenario" in
        "network")
            echo -e "${CYAN}📡 Triggering: Network connectivity issue (severe packet loss)${NC}"
            curl -X POST "${AGENT_URL}${WEBHOOK_ENDPOINT}" \
                -H "Content-Type: application/json" \
                -d '{
                    "incident_id": "DEMO-NET-'$(date +%s)'",
                    "alert_type": "Network Connectivity",
                    "title": "Network: 95% Packet Loss on Production LB",
                    "severity": "critical",
                    "source": "monitoring-system",
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "logs": "Connection timeout on 10.0.1.5:443. Retransmit rate: 95%. All services degraded.",
                    "metrics": {
                        "cpu": 45,
                        "memory": 78,
                        "network_loss": 95,
                        "requests_per_sec": 150
                    }
                }' \
                -w "\n" -s
            ;;
            
        "memory")
            echo -e "${CYAN}💾 Triggering: Memory leak in container${NC}"
            curl -X POST "${AGENT_URL}${WEBHOOK_ENDPOINT}" \
                -H "Content-Type: application/json" \
                -d '{
                    "incident_id": "DEMO-MEM-'$(date +%s)'",
                    "alert_type": "Memory Leak",
                    "title": "Container Memory: Leak detected (98% usage)",
                    "severity": "critical",
                    "source": "container-runtime",
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "logs": "Memory consumption increasing: 450MB → 920MB in 5 mins. OOM killer active.",
                    "metrics": {
                        "cpu": 12,
                        "memory": 98,
                        "requests_per_sec": 800
                    }
                }' \
                -w "\n" -s
            ;;
            
        "cpu")
            echo -e "${CYAN}⚡ Triggering: CPU spike and runaway process${NC}"
            curl -X POST "${AGENT_URL}${WEBHOOK_ENDPOINT}" \
                -H "Content-Type: application/json" \
                -d '{
                    "incident_id": "DEMO-CPU-'$(date +%s)'",
                    "alert_type": "CPU Spike",
                    "title": "Performance: CPU at 92% (runaway loop detected)",
                    "severity": "high",
                    "source": "kubernetes-metrics",
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "logs": "Process PID 2847 consuming 85% CPU. Stack trace shows infinite loop in data processor.",
                    "metrics": {
                        "cpu": 92,
                        "memory": 45,
                        "requests_per_sec": 450
                    }
                }' \
                -w "\n" -s
            ;;
            
        "database")
            echo -e "${CYAN}🗄️  Triggering: Database connection pool exhaustion${NC}"
            curl -X POST "${AGENT_URL}${WEBHOOK_ENDPOINT}" \
                -H "Content-Type: application/json" \
                -d '{
                    "incident_id": "DEMO-DB-'$(date +%s)'",
                    "alert_type": "Database Pool Exhaustion",
                    "title": "Database: Connection pool at capacity (100/100)",
                    "severity": "critical",
                    "source": "database-monitor",
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "logs": "All 100 connection slots occupied. New requests queued. Query timeout: 45 seconds average.",
                    "metrics": {
                        "cpu": 67,
                        "memory": 82,
                        "db_connections": 100,
                        "query_latency_ms": 45000
                    }
                }' \
                -w "\n" -s
            ;;
            
        "disk")
            echo -e "${CYAN}💿 Triggering: Disk space critical (5% free)${NC}"
            curl -X POST "${AGENT_URL}${WEBHOOK_ENDPOINT}" \
                -H "Content-Type: application/json" \
                -d '{
                    "incident_id": "DEMO-DISK-'$(date +%s)'",
                    "alert_type": "Disk Space Critical",
                    "title": "Storage: Disk space critical (5% free on /data)",
                    "severity": "critical",
                    "source": "host-monitor",
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "logs": "Partition /data: 950GB/1TB used. Application cannot write logs. Backups queued.",
                    "metrics": {
                        "disk_used_percent": 95,
                        "disk_free_gb": 50,
                        "inode_usage": 88
                    }
                }' \
                -w "\n" -s
            ;;
            
        "all")
            echo -e "${CYAN}🔥 Triggering cascade: All incident types (3s delay between each)${NC}"
            for incident in network cpu memory database disk; do
                trigger_incident "$incident" "$severity"
                sleep 3
            done
            return
            ;;
            
        *)
            echo -e "${RED}❌ Unknown scenario: $scenario${NC}"
            show_help
            exit 1
            ;;
    esac
    
    sleep 1
}

# ===== Function: Show help =====
show_help() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            AegisOps Demo Incident Trigger                     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <scenario> [severity]"
    echo ""
    echo -e "${YELLOW}Scenarios:${NC}"
    echo "  network     - Network connectivity / packet loss"
    echo "  memory      - Memory leak in container"
    echo "  cpu         - CPU spike / runaway process"
    echo "  database    - Database connection pool exhaustion"
    echo "  disk        - Disk space critical"
    echo "  all         - Trigger all scenarios sequentially"
    echo ""
    echo -e "${YELLOW}Severity (default: high):${NC}"
    echo "  low, medium, high, critical"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 network"
    echo "  $0 cpu critical"
    echo "  $0 all"
    echo ""
    echo -e "${YELLOW}Watch in real-time:${NC}"
    echo "  Screen 1: http://localhost:3000 (Cockpit UI)"
    echo "  Screen 2: VS Code ai_brain.py (Code review)"
    echo "  Screen 3: docker stats (Resource monitoring)"
    echo ""
}

# ===== Function: Show incident flow =====
show_flow() {
    echo ""
    echo -e "${CYAN}📊 Incident Pipeline:${NC}"
    echo "  1. Webhook received → Logged"
    echo "  2. RAG retrieval → Similar past incidents"
    echo "  3. LLM analysis → Root cause + action"
    echo "  4. Council vote → SRE, Security, Auditor"
    echo "  5. Action execute → Restart/scale containers"
    echo "  6. Health verify → Checks pass?"
    echo "  7. Runbook save → Learn for next time"
    echo ""
}

# ===== MAIN FLOW =====
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    check_agent_health
    
    trigger_incident "$1" "${2:-high}"
    
    echo ""
    echo -e "${GREEN}✅ Incident triggered!${NC}"
    show_flow
    echo -e "${CYAN}Watch the three screens to see the demo in action...${NC}"
    echo ""
}

main "$@"
