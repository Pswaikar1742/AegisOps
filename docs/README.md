# 🛡️ AegisOps — Documentation Index

[![GitHub repo](https://img.shields.io/badge/GitHub-Pswaikar1742%2FAegisOps-blue?logo=github)](https://github.com/Pswaikar1742/AegisOps)

> Autonomous AI SRE Command Center — full documentation.

**Repository:** https://github.com/Pswaikar1742/AegisOps

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [overview.md](overview.md) | What is AegisOps? GOD MODE pillars, architecture summary |
| [getting-started.md](getting-started.md) | Step-by-step setup, testing workflows, debugging |
| [architecture.md](architecture.md) | Deep technical dive into every component and the full pipeline |
| [api-reference.md](api-reference.md) | All REST and WebSocket endpoints with request/response examples |
| [llm-strategy.md](llm-strategy.md) | RAG engine, LLM providers, Multi-Agent Council, streaming |
| [prerequisites.md](prerequisites.md) | Hardware, software, API keys, project structure |
| [problem.md](problem.md) | The SRE problem AegisOps solves and its business case |
| [repo-overview.md](repo-overview.md) | Full technical inventory + QA checklist |
| [LOCAL_DEV.md](LOCAL_DEV.md) | Local development without Docker rebuilds |
| [Demo.pdf](Demo.pdf) | Demo presentation slides |

## 🗂️ Archive

Historical and development-phase reference documents are in [archive/](archive/).

## 🚀 Quick Start

```bash
git clone https://github.com/Pswaikar1742/AegisOps.git
cd AegisOps
cp aegis_core/.env.example aegis_core/.env
# Edit aegis_core/.env — set FASTRTR_API_KEY
docker-compose up --build
```

Open **http://localhost:3000** for the SRE Cockpit.

---

*For the full README and feature overview, see the [project root README](../README.md).*
