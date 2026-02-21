"""
AegisOps GOD MODE – AI Brain with streaming + Multi-Agent Council.

Primary:  FastRouter (Claude)
Fallback: Ollama (local llama3.2)

Features:
  • Streaming response for typewriter effect on UI
  • Council of 3 agents: SRE, Security Officer, Auditor
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

from openai import OpenAI

from .config import (
    FASTRTR_API_KEY, FASTRTR_BASE_URL, FASTRTR_MODEL,
    OLLAMA_BASE_URL, OLLAMA_MODEL,
    LOG_TRUNCATE_CHARS,
)
from .models import (
    AIAnalysis, CouncilDecision, CouncilRole, CouncilVerdict,
    CouncilVote, IncidentPayload,
)

logger = logging.getLogger("aegis.ai_brain")

_primary_client: OpenAI | None = None
_fallback_client: OpenAI | None = None


def _get_primary() -> OpenAI:
    global _primary_client
    if _primary_client is None:
        if not FASTRTR_API_KEY:
            raise RuntimeError("FASTRTR_API_KEY not set")
        _primary_client = OpenAI(base_url=FASTRTR_BASE_URL, api_key=FASTRTR_API_KEY)
        logger.info("FastRouter client ready (model=%s)", FASTRTR_MODEL)
    return _primary_client


def _get_fallback() -> OpenAI:
    global _fallback_client
    if _fallback_client is None:
        _fallback_client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
        logger.info("Ollama fallback client ready (model=%s)", OLLAMA_MODEL)
    return _fallback_client


def _truncate_logs(raw: str, max_chars: int = LOG_TRUNCATE_CHARS) -> str:
    if len(raw) <= max_chars:
        return raw
    return raw[-max_chars:]


# ── System prompts ───────────────────────────────────────────────────
SRE_SYSTEM = (
    "You are an expert SRE diagnostician.\n"
    "Analyse the incident payload and return **only** valid JSON:\n"
    '{"root_cause": "<one-line>", "action": "RESTART"|"SCALE_UP"|"SCALE_DOWN"|"ROLLBACK"|"NOOP", '
    '"justification": "<why>", "confidence": 0.0-1.0, "replica_count": <int>}\n'
    "For CPU spikes or memory leaks, prefer SCALE_UP with replica_count=2-3.\n"
    "For DB issues, prefer RESTART. For minor issues, use NOOP.\n"
    "Return ONLY the JSON object."
)

SECURITY_SYSTEM = (
    "You are a Security & Compliance Officer reviewing an SRE's proposed action.\n"
    "Given the incident and the proposed plan, return **only** valid JSON:\n"
    '{"verdict": "APPROVED"|"REJECTED"|"NEEDS_REVIEW", '
    '"reasoning": "<security assessment>"}\n'
    "APPROVE safe actions (restart, scale up/down). "
    "REJECT dangerous actions (rollback without backup, arbitrary code execution). "
    "Return ONLY the JSON object."
)

AUDITOR_SYSTEM = (
    "You are a Corporate Auditor logging compliance decisions.\n"
    "Given the incident, the SRE plan, and the security review, return **only** valid JSON:\n"
    '{"verdict": "APPROVED"|"REJECTED"|"NEEDS_REVIEW", '
    '"reasoning": "<compliance log entry>"}\n'
    "Check: Is the action proportionate? Is there an audit trail? "
    "APPROVE if the action is safe and logged. Return ONLY the JSON object."
)


def _parse_json(raw: str) -> dict:
    """Parse JSON from LLM response, stripping markdown fences."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(raw)


async def _call_llm(system: str, user_msg: str, model: str | None = None) -> str:
    """Call LLM with primary → fallback strategy. Returns raw text."""
    used_model = model or FASTRTR_MODEL

    # Try primary
    try:
        client = _get_primary()
        resp = await asyncio.to_thread(
            client.chat.completions.create,
            model=used_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        logger.warning("Primary LLM failed: %s – trying Ollama fallback", exc)

    # Fallback
    client = _get_fallback()
    resp = await asyncio.to_thread(
        client.chat.completions.create,
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()


async def stream_analysis(payload: IncidentPayload) -> AsyncGenerator[str, None]:
    """
    Stream AI thinking tokens for the typewriter effect.
    Yields individual characters/chunks of the SRE analysis.
    """
    safe_logs = _truncate_logs(payload.logs)
    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Logs (last {LOG_TRUNCATE_CHARS} chars):\n{safe_logs}"
    )

    try:
        client = _get_primary()
        model = FASTRTR_MODEL
    except Exception:
        client = _get_fallback()
        model = OLLAMA_MODEL

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=[
                {"role": "system", "content": SRE_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            stream=True,
        )
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception:
        # Non-streaming fallback
        raw = await _call_llm(SRE_SYSTEM, user_msg)
        for char in raw:
            yield char


async def analyze_logs(payload: IncidentPayload) -> AIAnalysis:
    """SRE Agent analysis – non-streaming version for pipeline use."""
    safe_logs = _truncate_logs(payload.logs)
    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Logs (last {LOG_TRUNCATE_CHARS} chars):\n{safe_logs}"
    )
    raw = await _call_llm(SRE_SYSTEM, user_msg)
    data = _parse_json(raw)
    analysis = AIAnalysis(**data)
    logger.info("SRE Agent ➜ cause=%s action=%s conf=%.2f",
                analysis.root_cause, analysis.action.value, analysis.confidence)
    return analysis


async def council_review(
    payload: IncidentPayload,
    analysis: AIAnalysis,
) -> CouncilDecision:
    """
    Multi-Agent Council: 3 agents vote on the proposed action.

    Agent A (SRE):              Already voted via analyze_logs
    Agent B (Security Officer): Reviews the plan for safety
    Agent C (Auditor):          Logs for compliance
    """
    decision = CouncilDecision()

    # Agent A: SRE already analysed – record vote
    sre_vote = CouncilVote(
        role=CouncilRole.SRE_AGENT,
        verdict=CouncilVerdict.APPROVED,
        reasoning=f"Proposing {analysis.action.value}: {analysis.justification}",
    )
    decision.votes.append(sre_vote)

    # Build context for reviewing agents
    plan_text = (
        f"Incident: {payload.incident_id} ({payload.alert_type})\n"
        f"Root Cause: {analysis.root_cause}\n"
        f"Proposed Action: {analysis.action.value}\n"
        f"Confidence: {analysis.confidence}\n"
        f"Replica Count: {analysis.replica_count}\n"
        f"Justification: {analysis.justification}\n"
    )

    # Agent B: Security Officer
    try:
        sec_raw = await _call_llm(SECURITY_SYSTEM, plan_text)
        sec_data = _parse_json(sec_raw)
        sec_vote = CouncilVote(
            role=CouncilRole.SECURITY_OFFICER,
            verdict=CouncilVerdict(sec_data.get("verdict", "APPROVED")),
            reasoning=sec_data.get("reasoning", "No issues found"),
        )
    except Exception as exc:
        logger.warning("Security agent failed: %s – auto-approving", exc)
        sec_vote = CouncilVote(
            role=CouncilRole.SECURITY_OFFICER,
            verdict=CouncilVerdict.APPROVED,
            reasoning=f"Auto-approved (agent error: {exc})",
        )
    decision.votes.append(sec_vote)

    # Agent C: Auditor
    audit_context = plan_text + f"\nSecurity Review: {sec_vote.verdict.value} - {sec_vote.reasoning}"
    try:
        aud_raw = await _call_llm(AUDITOR_SYSTEM, audit_context)
        aud_data = _parse_json(aud_raw)
        aud_vote = CouncilVote(
            role=CouncilRole.AUDITOR,
            verdict=CouncilVerdict(aud_data.get("verdict", "APPROVED")),
            reasoning=aud_data.get("reasoning", "Logged for compliance"),
        )
    except Exception as exc:
        logger.warning("Auditor agent failed: %s – auto-approving", exc)
        aud_vote = CouncilVote(
            role=CouncilRole.AUDITOR,
            verdict=CouncilVerdict.APPROVED,
            reasoning=f"Auto-approved (agent error: {exc})",
        )
    decision.votes.append(aud_vote)

    # Tally votes
    approvals = sum(1 for v in decision.votes if v.verdict == CouncilVerdict.APPROVED)
    decision.consensus = approvals >= 2
    decision.final_verdict = (
        CouncilVerdict.APPROVED if decision.consensus else CouncilVerdict.REJECTED
    )
    decision.summary = (
        f"Council voted {approvals}/3 APPROVED. "
        f"Final: {decision.final_verdict.value}"
    )
    logger.info("🏛️ Council: %s (%d/3 approved)", decision.final_verdict.value, approvals)

    return decision
