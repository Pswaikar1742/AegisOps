"""
AegisOps GOD MODE – Central configuration from environment variables.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_FILE)

# ── FastRouter (primary LLM) ────────────────────────────────────────
FASTRTR_API_KEY: str = os.getenv("FASTRTR_API_KEY", "")
FASTRTR_BASE_URL: str = os.getenv("FASTRTR_BASE_URL", "https://go.fastrouter.ai/api/v1")
FASTRTR_MODEL: str = os.getenv("FASTRTR_MODEL", "anthropic/claude-sonnet-4-20250514")

# ── Token-safety ─────────────────────────────────────────────────────
LOG_TRUNCATE_CHARS: int = int(os.getenv("LOG_TRUNCATE_CHARS", "2000"))

# ── Ollama local fallback ────────────────────────────────────────────
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

# ── Docker target ────────────────────────────────────────────────────
TARGET_CONTAINER: str = os.getenv("TARGET_CONTAINER", "buggy-app-v2")
HEALTH_URL: str = os.getenv("HEALTH_URL", f"http://{TARGET_CONTAINER}:8000/health")

# ── Verification timing ─────────────────────────────────────────────
VERIFY_DELAY_SECS: int = int(os.getenv("VERIFY_DELAY_SECS", "5"))
VERIFY_RETRIES: int = int(os.getenv("VERIFY_RETRIES", "3"))
HEALTH_TIMEOUT_SECS: int = int(os.getenv("HEALTH_TIMEOUT_SECS", "5"))

# ── Data persistence ─────────────────────────────────────────────────
DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
RUNBOOK_PATH: Path = DATA_DIR / "runbook.json"

# ── Slack notifications ─────────────────────────────────────────────
SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")

# ── Auto-Scaling ─────────────────────────────────────────────────────
MAX_REPLICAS: int = int(os.getenv("MAX_REPLICAS", "5"))
SCALE_COOLDOWN_SECS: int = int(os.getenv("SCALE_COOLDOWN_SECS", "30"))
NGINX_CONTAINER: str = os.getenv("NGINX_CONTAINER", "aegis-lb")
NGINX_CONF_PATH: str = os.getenv("NGINX_CONF_PATH", "/etc/nginx/conf.d/upstream.conf")

# ── Metrics polling ──────────────────────────────────────────────────
METRICS_INTERVAL_SECS: int = int(os.getenv("METRICS_INTERVAL_SECS", "3"))
