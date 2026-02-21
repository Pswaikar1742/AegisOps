"""
AegisOps – Central configuration loaded from environment variables.
"""

from __future__ import annotations

import os
from pathlib import Path

# ── Gemini / Google AI ───────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

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
