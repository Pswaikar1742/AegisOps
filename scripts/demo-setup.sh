#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════════╗
# ║     AegisOps Demo Setup - Three-Screen Orchestrator                           ║
# ║     Screen 1: React Cockpit (http://localhost:3000)                           ║
# ║     Screen 2: VS Code with ai_brain.py                                         ║
# ║     Screen 3: Terminal with docker stats                                       ║
# ╚════════════════════════════════════════════════════════════════════════════════╝

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_PORT=3000
VSCODE_PORT=8001
DOCKER_STATS_REFRESH=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          🎬 AegisOps Demo - Three Screen Setup               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===== Function: Check if command exists =====
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ===== Function: Wait for service =====
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    echo -ne "${YELLOW}⏳ Waiting for $name...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            echo -e "\r${GREEN}✅ $name is ready!${NC}\n"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -ne "\r⏳ Waiting for $name... ($attempt/$max_attempts)"
        sleep 1
    done
    echo -e "\r${RED}❌ Timeout waiting for $name${NC}\n"
    return 1
}

# ===== Function: Check docker =====
check_docker() {
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
        exit 1
    fi
    if ! docker ps >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}\n"
}

# ===== Function: Start docker-compose =====
start_docker_compose() {
    echo -e "${CYAN}📦 Starting Docker Compose services...${NC}"
    cd "$PROJECT_ROOT"
    
    if docker-compose ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠️  Services already running. Checking health...${NC}"
    else
        echo -e "${YELLOW}Starting services...${NC}"
        docker-compose -f docker-compose.yml up -d 2>&1 | grep -E "^(Creating|Starting|aegis-|done)" || true
    fi
    
    echo -e "${GREEN}✅ Docker Compose started${NC}\n"
}

# ===== Function: Open Cockpit in browser =====
open_cockpit() {
    echo -e "${CYAN}🌐 Opening React Cockpit (http://localhost:3000)...${NC}"
    
    wait_for_service "http://localhost:$DEMO_PORT" "React Cockpit" || return 1
    
    if command_exists xdg-open; then
        xdg-open "http://localhost:$DEMO_PORT" &
    elif command_exists open; then
        open "http://localhost:$DEMO_PORT" &
    else
        echo -e "${YELLOW}⚠️  Please manually open: http://localhost:$DEMO_PORT${NC}"
    fi
    
    echo -e "${GREEN}✅ Cockpit opened${NC}\n"
}

# ===== Function: Open VS Code with ai_brain.py =====
open_vscode() {
    echo -e "${CYAN}📝 Opening VS Code with ai_brain.py...${NC}"
    
    if ! command_exists code; then
        echo -e "${YELLOW}⚠️  VS Code is not installed. Install with: 'code --version' should work${NC}"
        echo -e "${YELLOW}   Or manually open: ${PROJECT_ROOT}/aegis_core/app/ai_brain.py${NC}"
        return 1
    fi
    
    # Open VS Code with ai_brain.py at specific line (RAG section)
    local ai_brain_file="${PROJECT_ROOT}/aegis_core/app/ai_brain.py"
    if [ -f "$ai_brain_file" ]; then
        code --new-window "$ai_brain_file:276" &  # Line 276 is where _sanitize_text starts
    else
        code --new-window "$PROJECT_ROOT" &
    fi
    
    sleep 2
    echo -e "${GREEN}✅ VS Code opened${NC}\n"
}

# ===== Function: Open docker stats in terminal =====
open_docker_stats() {
    echo -e "${CYAN}📊 Opening docker stats terminal...${NC}"
    
    # Detect terminal emulator
    local terminal_cmd=""
    
    if command_exists gnome-terminal; then
        terminal_cmd="gnome-terminal -- bash -c"
    elif command_exists konsole; then
        terminal_cmd="konsole -e bash -c"
    elif command_exists xterm; then
        terminal_cmd="xterm -e bash -c"
    elif command_exists xfce4-terminal; then
        terminal_cmd="xfce4-terminal -e bash -c"
    else
        echo -e "${YELLOW}⚠️  No terminal emulator found. Please run manually:${NC}"
        echo -e "${YELLOW}   docker stats --all --no-trunc${NC}"
        return 1
    fi
    
    eval "$terminal_cmd 'echo \"🔍 Docker Stats (Press Ctrl+C to exit)\"; echo \"\"; docker stats --all --no-trunc --format \"table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}\"; exec bash'" &
    
    sleep 1
    echo -e "${GREEN}✅ Docker stats terminal opened${NC}\n"
}

# ===== Function: Display keyboard shortcuts =====
display_shortcuts() {
    echo -e "${CYAN}⌨️  Demo Navigation Guide:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Cockpit (Screen 1):${NC}"
    echo -e "  • View active incidents, metrics, topology"
    echo -e "  • Watch AI stream in real-time"
    echo -e "  • See council votes (SRE, Security, Auditor)"
    echo ""
    echo -e "${YELLOW}VS Code (Screen 2):${NC}"
    echo -e "  • Review ai_brain.py: RAG retrieval, LLM prompt, confidence normalization"
    echo -e "  • Check _sanitize_text() at line ~276"
    echo -e "  • See analyze_logs() function (core AI logic)"
    echo ""
    echo -e "${YELLOW}Docker Stats (Screen 3):${NC}"
    echo -e "  • Monitor CPU/Memory usage"
    echo -e "  • Watch container auto-scaling when incidents trigger"
    echo -e "  • See resource spikes during AI analysis"
    echo ""
    echo -e "${YELLOW}To trigger demo incidents, run in another terminal:${NC}"
    echo -e "  ${CYAN}cd $PROJECT_ROOT && bash scripts/trigger-demo-incident.sh${NC}"
    echo ""
}

# ===== Function: Display summary =====
display_summary() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  ✅ Demo Setup Complete!                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Services Running:${NC}"
    echo "  📡 Cockpit:     http://localhost:3000"
    echo "  🧠 Agent API:   http://localhost:8001"
    echo "  📊 Dashboard:   http://localhost:8501"
    echo "  🔄 Load Balancer: http://localhost:80"
    echo ""
    echo -e "${GREEN}Three Screens Opened:${NC}"
    echo "  1️⃣  React Cockpit (fullscreen UI)"
    echo "  2️⃣  VS Code with ai_brain.py (code review)"
    echo "  3️⃣  Docker Stats terminal (resource monitoring)"
    echo ""
}

# ===== MAIN FLOW =====
main() {
    check_docker
    start_docker_compose
    
    # Give docker-compose time to stabilize
    sleep 3
    
    # Open all three screens
    open_cockpit || true
    sleep 1
    
    open_vscode || true
    sleep 1
    
    open_docker_stats || true
    sleep 1
    
    display_summary
    display_shortcuts
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}💡 Ready for demo! Check the three screens to get started.${NC}"
    echo -e "${CYAN}   Press any key to see additional help...${NC}"
    read -r
    
    echo ""
    echo -e "${CYAN}📖 Additional Resources:${NC}"
    echo -e "  • Docs: $PROJECT_ROOT/docs/repo-overview.md"
    echo -e "  • Demo Guide: $PROJECT_ROOT/docs/DEMO.md"
    echo -e "  • Changes: $PROJECT_ROOT/CHANGES.md"
    echo ""
}

main "$@"
