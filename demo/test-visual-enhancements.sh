#!/bin/bash
# QUICK TEST SCRIPT - Visual Enhancements Demo
# Usage: bash test-visual-enhancements.sh

echo "🎬 AegisOps Visual Enhancements - Test Suite"
echo "==========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}1. Testing Heartbeat Animation${NC}"
echo "   ✓ Location: http://localhost:3000 (top-right corner)"
echo "   ✓ Look for: Pulsing green circle next to 'SYSTEM ONLINE'"
echo "   ✓ Animation: 2-second pulse cycle"
echo ""

echo -e "${CYAN}2. Testing Typewriter Effect${NC}"
echo "   → Trigger network incident:"
echo "      bash scripts/trigger-demo-incident.sh network"
echo "   ✓ Watch: AI Stream Panel reveals text character-by-character"
echo "   ✓ Speed: ~30ms per character (bright cyan #0ff on black #000)"
echo "   ✓ Font: Monospace (Fira Code)"
echo ""

echo -e "${CYAN}3. Testing Scale Visualizer${NC}"
echo "   → Trigger CPU spike to force scaling:"
echo "      bash scripts/trigger-demo-incident.sh cpu"
echo "   ✓ Watch: Incident detail view shows replica boxes (R1, R2, R3...)"
echo "   ✓ Effect: Pop-in with elastic fade over 0.5s"
echo "   ✓ Cascade: Each box delayed 0.1s for wave effect"
echo ""

echo -e "${CYAN}4. Testing Red Alert Mode${NC}"
echo "   → Trigger critical incident:"
echo "      bash scripts/trigger-demo-incident.sh memory"
echo "   ✓ Watch: Incident card pulses red (if severity = CRITICAL)"
echo "   ✓ Border: 2px pulsing red #DB0927"
echo "   ✓ Background: Red glow with rgba pulse 8%→15%→8%"
echo ""

echo -e "${CYAN}5. Verify AI Integration${NC}"
echo "   ✓ Primary: FastRouter (Claude API) - anthropic/claude-sonnet-4-20250514"
echo "   ✓ Fallback: Ollama local - llama3.2:latest"
echo ""
echo "   Check AI health:"
echo "      curl http://localhost:8001/health | jq ."
echo ""
echo "   View available models:"
echo "      curl http://localhost:11434/api/tags | jq '.models[].name'"
echo ""

echo -e "${GREEN}==========================================="
echo "All systems ready! Open http://localhost:3000${NC}"
echo ""
