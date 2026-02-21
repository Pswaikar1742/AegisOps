"""
AegisOps – AI Brain powered by Google Gemini 1.5 Flash.

Sends incident logs to Gemini and expects STRICT JSON:
  {"root_cause": "...", "action": "RESTART", "justification": "..."}
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import google.generativeai as genai

from .config import GEMINI_API_KEY, GEMINI_MODEL
from .models import AIAnalysis, IncidentPayload

logger = logging.getLogger("aegis.ai_brain")

# ── Gemini client (lazy-initialised once) ────────────────────────────
_model: Optional[genai.GenerativeModel] = None


def _get_model() -> genai.GenerativeModel:
    """Return (and cache) the Gemini GenerativeModel instance."""
    global _model
    if _model is None:
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set – export it before starting the server."
            )
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info("Gemini model '%s' initialised.", GEMINI_MODEL)
    return _model


# ── System prompt ────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are an expert SRE diagnostician.
Analyse the incident payload below and return **only** valid JSON – no markdown, no backticks.

Required JSON schema:
{
  "root_cause": "<one-line summary>",
  "action": "RESTART" | "SCALE_UP" | "ROLLBACK" | "NOOP",
  "justification": "<why you chose this action>"
}
"""


async def analyse_incident(payload: IncidentPayload) -> AIAnalysis:
    """Send logs to Gemini and parse its structured JSON response."""

    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Logs:\n{payload.logs}"
    )

    model = _get_model()

    # Gemini Python SDK exposes generate_content (sync); we run it in a
    # thread so FastAPI's event loop is never blocked.
    import asyncio

    response = await asyncio.to_thread(
        model.generate_content,
        [SYSTEM_PROMPT, user_msg],
    )

    raw = response.text.strip()
    logger.debug("Gemini raw response: %s", raw)

    # Strip markdown code fences if Gemini wraps the answer anyway.
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %s", raw)
        raise ValueError(f"Gemini response is not valid JSON: {exc}") from exc

    analysis = AIAnalysis(**data)
    logger.info(
        "Analysis ➜ cause=%s  action=%s",
        analysis.root_cause,
        analysis.action.value,
    )
    return analysis
