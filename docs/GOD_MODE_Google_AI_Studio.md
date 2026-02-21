# AegisOps — God Mode (Google AI Studio Summary)

This document summarizes the current state of the AegisOps repository and the "God Mode" cockpit for use in Google AI Studio (presentation, demo notes, and run instructions).

## Project summary

- Repository: AegisOps — Autonomous AI SRE Command Center
- Focus: autonomous detection, diagnosis and remediation of production incidents via a multi-agent safety council and local LLM (Ollama) with RAG runbook.
- God Mode: a NASA-style 4-zone cockpit UI (React + Vite + Tailwind) that visualizes telemetry, topology, council decisions, and an AI neural stream.

## Key components

- `aegis_core` (FastAPI) — backend AI brain, REST endpoints and WebSocket `/ws` for live frames. Handles `/webhook`, `/scale`, `/incidents`, `/containers`, `/topology`, and runbook RAG.
- `aegis_cockpit` (React) — frontend cockpit UI at port `3000`. Main component: `DashboardCockpit.jsx` (4 zones: Chaos Injection, Telemetry/Topology, Council/AI Stream, Event Log).
- `buggy-app-v2` — intentionally fragile target application used to demonstrate incidents.
- `docker-compose.yml` — local orchestration for demo.

## God Mode features to highlight

- Chaos Injection panel: buttons to inject incidents (OOM, CPU spike, DB lock, Net lag, Disk full, Pod crash).
- Live Telemetry: CPU, Memory, DB latency and Network RTT bars (color-coded and animated on spike).
- Infrastructure topology: Internet → NGINX LB → App Replicas (R1..R5) visualizer — replica slots glow when active.
- Multi-Agent Safety Council: SRE, Security, Auditor — 2/3 majority required for actions.
- AI Neural Stream: streaming AI analysis, recommended action, confidence and justification.
- Optimistic scaling: UI triggers `/scale/up` and `/scale/down` and shows immediate replica changes (falls back to confirmed state when backend sends `scale.event`).

## Demo steps (quick)

1. Start stack

```bash
docker compose up -d
```

2. Open cockpit

```
http://localhost:3000
```

3. Trigger an incident from UI (e.g., Disk Full) and watch the following in Google AI Studio:

- Terminal 1 (Agent logs): `docker logs -f aegis-agent`
- Terminal 2 (Docker stats): `docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"`
- Terminal 3 (Incidents list): `watch -n 2 'curl -s http://localhost:8001/incidents | jq .'`

4. In the cockpit, click `+1` or `+2` under the App Replicas to scale. The UI will show the next replica slot illuminated. Backend may need proper Docker network to actually spawn containers.

## Notes for demonstrators (troubleshooting)

- If the backend shows `network aegis-network not found` when scaling, run `docker compose up -d` from repo root to recreate networks, or create the network manually: `docker network create aegis-network`.
- If Ollama LLM is not available, the system falls back to a configured remote model (Anthropic Claude) if `ANTHROPIC_API_KEY` is set.

## What to show in Google AI Studio

- A short video clip (30s) of: clicking `Disk Full` → AI stream shows root cause → council votes → scale action → metrics normalize.
- A split view: cockpit UI, agent logs (filtered), and docker stats.
- A note pointing to the `docs/` README and `GOD_MODE_Google_AI_Studio.md` for instructions and reproduction steps.

## Files to reference in the studio notebook

- `aegis_cockpit/src/components/DashboardCockpit.jsx`
- `aegis_core/app/main.py` (webhook and /scale handlers)
- `aegis_core/app/docker_ops.py` (spawn/scale helpers)
- `docs/README.md` (project docs and demo guide)

## Current limitations

- UI uses optimistic scaling; if Docker network or image creation fails, replicas won't actually run — backend logs show the failure.
- Some parts of the cockpit show simulated fallback flows when backend is unreachable.

---

This file is intended to be included in Google AI Studio as a markdown slide or notebook cell explaining the demo architecture and current God Mode capabilities.
