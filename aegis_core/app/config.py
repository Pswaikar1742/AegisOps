"""
AegisOps – Central configuration loaded from environment variables.
"""

from __future__ import annotations

import os
from pathlib import Path

# ── FastRouter (OpenAI-compatible) ───────────────────────────────────
FASTRTR_API_KEY: str = os.getenv("FASTRTR_API_KEY", "")
FASTRTR_BASE_URL: str = os.getenv(
    "FASTRTR_BASE_URL", "https://go.fastrouter.ai/api/v1"
)
FASTRTR_MODEL: str = os.getenv(
    "FASTRTR_MODEL", "anthropic/claude-sonnet-4-20250514"
)

# ── Token-safety ─────────────────────────────────────────────────────
LOG_TRUNCATE_CHARS: int = int(os.getenv("LOG_TRUNCATE_CHARS", "2000"))

# ── Docker target ────────────────────────────────────────────────────
TARGET_CONTAINER: str = os.getenv("TARGET_CONTAINER", "buggy-app-v2")
HEALTH_URL: str = os.getenv(
    "HEALTH_URL", f"http://{TARGET_CONTAINER}:8000/health"
)

# ── Verification timing ─────────────────────────────────────────────
VERIFY_DELAY_SECS: int = int(os.getenv("VERIFY_DELAY_SECS", "5"))
HEALTH_TIMEOUT_SECS: int = int(os.getenv("HEALTH_TIMEOUT_SECS", "5"))

# ── Runbook persistence ─────────────────────────────────────────────
DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
RUNBOOK_PATH: Path = DATA_DIR / "runbook.json"
