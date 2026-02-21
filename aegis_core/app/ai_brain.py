"""
AegisOps – AI Brain powered by FastRouter (OpenAI-compatible API).

Sends incident logs to the LLM and expects STRICT JSON:
  {"root_cause": "...", "action": "RESTART", "justification": "..."}

Token-safety: raw logs are truncated to the last 2 000 characters
before they leave this process – no full dumps ever hit the API.
"""

from __future__ import annotations

import asyncio
import json
import logging

from openai import OpenAI

from .config import FASTRTR_API_KEY, FASTRTR_BASE_URL, FASTRTR_MODEL, LOG_TRUNCATE_CHARS
from .models import AIAnalysis, IncidentPayload

logger = logging.getLogger("aegis.ai_brain")

# ── OpenAI-compatible client (lazy-initialised once) ─────────────────
_client: OpenAI | None = None


def _get_client() -> OpenAI:
    """Return (and cache) the OpenAI client pointed at FastRouter."""
    global _client
    if _client is None:
        if not FASTRTR_API_KEY:
            raise RuntimeError(
                "FASTRTR_API_KEY is not set – export it before starting the server."
            )
        _client = OpenAI(
            base_url=FASTRTR_BASE_URL,
            api_key=FASTRTR_API_KEY,
        )
        logger.info(
            "FastRouter client initialised (model=%s, url=%s).",
            FASTRTR_MODEL,
            FASTRTR_BASE_URL,
        )
    return _client


# ── Token-safety: truncate logs ──────────────────────────────────────
def _truncate_logs(raw_logs: str, max_chars: int = LOG_TRUNCATE_CHARS) -> str:
    """Keep only the **last** `max_chars` characters of the log blob."""
    if len(raw_logs) <= max_chars:
        return raw_logs
    logger.info(
        "Truncating logs from %d → %d chars (last %d kept).",
        len(raw_logs),
        max_chars,
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


async def analyze_logs(payload: IncidentPayload) -> AIAnalysis:
    """
    Send *truncated* logs to the LLM and parse its strict-JSON response.

    • Logs are capped to the last 2 000 characters before leaving.
    • On LLM failure the exception propagates (caller decides retry policy).
    """

    safe_logs = _truncate_logs(payload.logs)

    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Logs (last {LOG_TRUNCATE_CHARS} chars):\n{safe_logs}"
    )

    client = _get_client()

    # The openai SDK is synchronous – offload to a thread so the
    # FastAPI event-loop is never blocked.
    response = await asyncio.to_thread(
        client.chat.completions.create,
        model=FASTRTR_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
    )

    raw: str = response.choices[0].message.content.strip()
    logger.debug("LLM raw response: %s", raw)

    # Strip markdown code fences the model might add anyway.
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("LLM returned non-JSON: %s", raw)
        raise ValueError(f"LLM response is not valid JSON: {exc}") from exc

    analysis = AIAnalysis(**data)
    logger.info(
        "Analysis ➜ cause=%s  action=%s",
        analysis.root_cause,
        analysis.action.value,
    )
    return analysis
