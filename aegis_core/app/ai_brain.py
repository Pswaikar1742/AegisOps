"""
AegisOps – AI Brain with FastRouter primary + Ollama local fallback.

Flow:
  1. Truncate logs to last 2 000 chars (token safety).
  2. Try FastRouter (cloud LLM) first.
  3. If FastRouter fails → fall back to Ollama running locally.
  4. Parse strict JSON response into AIAnalysis.
  5. Never auto-retry the same provider (save credits / time).
"""

from __future__ import annotations

import asyncio
import json
import logging

from openai import OpenAI, OpenAIError

from .config import (
    FASTRTR_API_KEY,
    FASTRTR_BASE_URL,
    FASTRTR_MODEL,
    LOG_TRUNCATE_CHARS,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
)
from .models import AIAnalysis, IncidentPayload

logger = logging.getLogger("aegis.ai_brain")

# ── Clients (lazy-initialised once each) ─────────────────────────────
_fastrtr_client: OpenAI | None = None
_ollama_client: OpenAI | None = None


def _get_fastrtr_client() -> OpenAI:
    global _fastrtr_client
    if _fastrtr_client is None:
        if not FASTRTR_API_KEY:
            raise RuntimeError("FASTRTR_API_KEY is not set.")
        _fastrtr_client = OpenAI(
            base_url=FASTRTR_BASE_URL,
            api_key=FASTRTR_API_KEY,
        )
        logger.info("FastRouter client ready  (model=%s)", FASTRTR_MODEL)
    return _fastrtr_client


def _get_ollama_client() -> OpenAI:
    """Ollama exposes an OpenAI-compatible /v1 endpoint – no key needed."""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OpenAI(
            base_url=OLLAMA_BASE_URL,
            api_key="ollama",  # Ollama ignores the key but the SDK requires one
        )
        logger.info("Ollama client ready     (model=%s, url=%s)", OLLAMA_MODEL, OLLAMA_BASE_URL)
    return _ollama_client


# ── Token-safety: truncate logs ──────────────────────────────────────
def _truncate_logs(raw_logs: str, max_chars: int = LOG_TRUNCATE_CHARS) -> str:
    """Keep only the **last** `max_chars` characters of the log blob."""
    if len(raw_logs) <= max_chars:
        return raw_logs
    logger.info(
        "Truncating logs from %d → %d chars.",
        len(raw_logs),
        max_chars,
    )
    return raw_logs[-max_chars:]


# ── System prompt ────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are an expert SRE diagnostician.\n"
    "Analyse the incident payload below and return **only** valid JSON "
    "– no markdown, no backticks, no extra text.\n\n"
    "Required JSON schema:\n"
    '{\n'
    '  "root_cause": "<one-line summary>",\n'
    '  "action": "RESTART" | "SCALE_UP" | "ROLLBACK" | "NOOP",\n'
    '  "justification": "<why you chose this action>"\n'
    '}\n'
)


# ── Internal: call a single provider ─────────────────────────────────
def _call_provider(client: OpenAI, model: str, messages: list[dict]) -> str:
    """Blocking call – always run inside asyncio.to_thread."""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def _parse_json(raw: str) -> dict:
    """Strip optional markdown fences and parse JSON."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(text)


# ── Public entry point ───────────────────────────────────────────────
async def analyze_logs(payload: IncidentPayload) -> AIAnalysis:
    """
    Analyse incident logs via LLM.

    Strategy:
      • Try FastRouter first (cloud, high quality).
      • On ANY failure → fall back to local Ollama (free, offline).
      • If both fail → raise so caller can mark incident FAILED.
    """

    safe_logs = _truncate_logs(payload.logs)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Incident ID : {payload.incident_id}\n"
                f"Alert Type  : {payload.alert_type}\n"
                f"Logs (last {LOG_TRUNCATE_CHARS} chars):\n{safe_logs}"
            ),
        },
    ]

    # ── Attempt 1: FastRouter ────────────────────────────────────────
    try:
        logger.info("🌐 Trying FastRouter (%s)…", FASTRTR_MODEL)
        raw = await asyncio.to_thread(
            _call_provider, _get_fastrtr_client(), FASTRTR_MODEL, messages,
        )
        logger.debug("FastRouter raw: %s", raw)
        data = _parse_json(raw)
        analysis = AIAnalysis(**data)
        logger.info(
            "✅ FastRouter → cause=%s  action=%s",
            analysis.root_cause, analysis.action.value,
        )
        return analysis

    except Exception as cloud_exc:  # noqa: BLE001
        logger.warning(
            "⚠️  FastRouter failed (%s) – falling back to Ollama.", cloud_exc,
        )

    # ── Attempt 2: Ollama (local) ────────────────────────────────────
    try:
        logger.info("🏠 Trying Ollama (%s)…", OLLAMA_MODEL)
        raw = await asyncio.to_thread(
            _call_provider, _get_ollama_client(), OLLAMA_MODEL, messages,
        )
        logger.debug("Ollama raw: %s", raw)
        data = _parse_json(raw)
        analysis = AIAnalysis(**data)
        logger.info(
            "✅ Ollama    → cause=%s  action=%s",
            analysis.root_cause, analysis.action.value,
        )
        return analysis

    except Exception as local_exc:  # noqa: BLE001
        logger.error("❌ Ollama also failed: %s", local_exc)
        raise RuntimeError(
            f"Both LLM providers failed.  "
            f"FastRouter: {cloud_exc}  |  Ollama: {local_exc}"
        ) from local_exc
