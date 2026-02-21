"""
AegisOps GOD MODE – AI Brain v3.0: RAG-Augmented + Multi-Agent Council.

Architecture:
  ┌─────────────────────────────────────────────────────────┐
  │  Incident Webhook                                       │
  │      ↓                                                  │
  │  ① RAG Retrieval (TF-IDF cosine similarity)             │
  │      → Top-2 runbook entries injected into system prompt │
  │      ↓                                                  │
  │  ② SRE Analysis (streaming + non-streaming)             │
  │      ↓                                                  │
  │  ③ Multi-Agent Council (Security + Auditor)             │
  │      ↓                                                  │
  │  ④ Runbook Learning (save logs+cause+action for RAG)    │
  └─────────────────────────────────────────────────────────┘

Primary LLM:  FastRouter (Claude)
Fallback:     Ollama (local llama3.2)
RAG Engine:   TF-IDF Vectorizer + Cosine Similarity (zero API calls)
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import AsyncGenerator

import numpy as np
from openai import OpenAI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .config import (
    FASTRTR_API_KEY, FASTRTR_BASE_URL, FASTRTR_MODEL,
    OLLAMA_BASE_URL, OLLAMA_MODEL,
    LOG_TRUNCATE_CHARS, RUNBOOK_PATH,
)
from .models import (
    AIAnalysis, CouncilDecision, CouncilRole, CouncilVerdict,
    CouncilVote, IncidentPayload,
)

logger = logging.getLogger("aegis.ai_brain")

_primary_client: OpenAI | None = None
_fallback_client: OpenAI | None = None


# ═══════════════════════════════════════════════════════════════════════
# LLM Client Management
# ═══════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════
# ① RAG ENGINE – TF-IDF Runbook Retrieval (zero API calls)
# ═══════════════════════════════════════════════════════════════════════

def _load_runbook(path: Path = RUNBOOK_PATH) -> list[dict]:
    """Load runbook entries from disk. Returns empty list if missing."""
    if not path.exists() or path.stat().st_size < 3:
        return []
    try:
        data = json.loads(path.read_text())
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Runbook load failed: %s", exc)
        return []


def _build_corpus_text(entry: dict) -> str:
    """
    Build a single searchable string from a runbook entry.
    Combines logs + alert_type + root_cause + action + justification
    so the TF-IDF vectorizer can match on any of those signals.
    """
    parts = [
        entry.get("logs", ""),
        entry.get("alert_type", ""),
        entry.get("root_cause", ""),
        entry.get("action", ""),
        entry.get("justification", ""),
        entry.get("severity", ""),
        entry.get("container_name", ""),
    ]
    return " ".join(p for p in parts if p).lower()


def get_relevant_runbook_entries(
    current_logs: str,
    top_k: int = 2,
    min_similarity: float = 0.05,
) -> list[dict]:
    """
    Retrieve the Top-K most similar past incidents using TF-IDF + Cosine
    Similarity. This is a local RAG retrieval — zero external API calls.

    Algorithm:
      1. Load runbook.json from disk
      2. Build a text corpus: each entry's logs+cause+action concatenated
      3. Fit TfidfVectorizer on [corpus_entries... , current_query]
      4. Compute cosine similarity between current_query and each entry
      5. Return top_k entries above min_similarity threshold

    Args:
        current_logs: The raw logs from the current incident
        top_k: Number of most similar entries to return (default 2)
        min_similarity: Minimum cosine similarity threshold

    Returns:
        List of dicts with keys: incident_id, alert_type, root_cause,
        action, justification, similarity_score, logs
    """
    entries = _load_runbook()
    if not entries:
        logger.info("📚 RAG: Runbook empty – no prior knowledge to retrieve.")
        return []

    # Build corpus: one document per runbook entry
    corpus_texts = [_build_corpus_text(e) for e in entries]
    query_text = current_logs.lower()

    # Append query as last document so it shares the same TF-IDF space
    all_documents = corpus_texts + [query_text]

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),       # unigrams + bigrams for richer matching
            sublinear_tf=True,         # log-normalize term frequencies
        )
        tfidf_matrix = vectorizer.fit_transform(all_documents)

        # Query vector is the last row; corpus vectors are [0:-1]
        query_vec = tfidf_matrix[-1]
        corpus_vecs = tfidf_matrix[:-1]

        # Cosine similarity: query vs each corpus entry
        similarities = cosine_similarity(query_vec, corpus_vecs).flatten()

        # Rank by similarity, descending
        ranked_indices = np.argsort(similarities)[::-1]

        results = []
        for idx in ranked_indices[:top_k]:
            score = float(similarities[idx])
            if score < min_similarity:
                continue
            entry = entries[idx]
            results.append({
                "incident_id": entry.get("incident_id", "unknown"),
                "alert_type": entry.get("alert_type", "unknown"),
                "root_cause": entry.get("root_cause", ""),
                "action": entry.get("action", ""),
                "justification": entry.get("justification", ""),
                "logs": entry.get("logs", "")[:300],  # truncate for prompt
                "similarity_score": round(score, 4),
                "container_name": entry.get("container_name", ""),
                "severity": entry.get("severity", ""),
                "replicas_used": entry.get("replicas_used", 0),
            })

        if results:
            logger.info(
                "📚 RAG: Retrieved %d similar incidents (best=%.3f)",
                len(results), results[0]["similarity_score"],
            )
        else:
            logger.info("📚 RAG: No entries above similarity threshold %.2f", min_similarity)

        return results

    except Exception as exc:
        logger.warning("📚 RAG retrieval failed (non-fatal): %s", exc)
        return []


def _format_rag_context(rag_entries: list[dict]) -> str:
    """
    Format RAG-retrieved runbook entries into a context block
    that gets injected into the SRE system prompt.
    """
    if not rag_entries:
        return ""

    lines = [
        "\n\n── RUNBOOK KNOWLEDGE (from past resolved incidents) ──",
        "Use these to inform your analysis. Learn from what worked before.\n",
    ]
    for i, entry in enumerate(rag_entries, 1):
        lines.append(f"Past Incident #{i} (similarity: {entry['similarity_score']:.1%}):")
        lines.append(f"  Alert Type : {entry['alert_type']}")
        lines.append(f"  Root Cause : {entry['root_cause']}")
        lines.append(f"  Action     : {entry['action']}")
        lines.append(f"  Justification: {entry['justification']}")
        if entry.get("replicas_used"):
            lines.append(f"  Replicas   : {entry['replicas_used']}")
        lines.append(f"  Log Snippet: {entry['logs'][:200]}")
        lines.append("")

    lines.append(
        "If the current incident is similar, apply the same proven fix. "
        "If it's different, reason from first principles.\n"
        "── END RUNBOOK KNOWLEDGE ──"
    )
    return "\n".join(lines)


def _sanitize_text(raw: str) -> str:
    """
    Lightweight sanitizer to correct common LLM spelling/formatting issues
    before persisting or sending to clients. This is intentionally simple
    (whitelist replacements) so we don't attempt heavy NLP here.
    """
    if not raw:
        return raw
    s = raw
    replacements = {
        'Rot Cause': 'Root Cause',
        'NNtwork': 'Network',
        'Netwrok': 'Network',
        'connettivity': 'connectivity',
        'conectivity': 'connectivity',
        'Justificatiin': 'Justification',
        'Justificaton': 'Justification',
        'uggy-app-v2': 'buggy-app-v2',
        '\t': ' ',
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    # basic whitespace normalisation
    s = ' '.join(s.split())
    return s


# ═══════════════════════════════════════════════════════════════════════
# ② RAG-AUGMENTED SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════════

_SRE_BASE = (
    "You are an expert SRE diagnostician with memory of past incidents.\n"
    "Analyse the incident payload and return **only** valid JSON:\n"
    '{"root_cause": "<one-line>", "action": "RESTART"|"SCALE_UP"|"SCALE_DOWN"|"ROLLBACK"|"NOOP", '
    '"justification": "<why>", "confidence": 0.0-1.0, "replica_count": <int>}\n'
    "For CPU spikes or memory leaks, prefer SCALE_UP with replica_count=2-3.\n"
    "For DB issues, prefer RESTART. For minor issues, use NOOP.\n"
    "For pod crashes or OOM kills, prefer RESTART with high confidence.\n"
    "If you have past runbook knowledge below, USE IT to improve your diagnosis.\n"
    "A higher confidence means you've seen this pattern before.\n"
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


def _build_sre_system_prompt(rag_entries: list[dict]) -> str:
    """
    Build the full SRE system prompt by injecting RAG context.
    This is where recursive learning manifests — every resolved incident
    improves future diagnoses without retraining or API embedding calls.
    """
    rag_block = _format_rag_context(rag_entries)
    return _SRE_BASE + rag_block


# ═══════════════════════════════════════════════════════════════════════
# ③ STREAMING ANALYSIS (Typewriter UI Effect)
# ═══════════════════════════════════════════════════════════════════════

async def stream_analysis(payload: IncidentPayload) -> AsyncGenerator[str, None]:
    """
    Stream AI thinking tokens for the typewriter effect.
    Now RAG-augmented: retrieves similar past incidents first.
    """
    safe_logs = _truncate_logs(payload.logs)

    # ── RAG Retrieval ──
    rag_entries = await asyncio.to_thread(
        get_relevant_runbook_entries, safe_logs
    )
    system_prompt = _build_sre_system_prompt(rag_entries)

    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Container   : {payload.container_name or 'unknown'}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Severity    : {payload.severity or 'UNKNOWN'}\n"
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
                {"role": "system", "content": system_prompt},
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
        raw = await _call_llm(system_prompt, user_msg)
        for char in raw:
            yield char


# ═══════════════════════════════════════════════════════════════════════
# ④ SRE ANALYSIS (Non-streaming, for pipeline use)
# ═══════════════════════════════════════════════════════════════════════

async def analyze_logs(payload: IncidentPayload) -> AIAnalysis:
    """
    RAG-Augmented SRE Agent analysis.

    Pipeline:
      1. Retrieve top-2 similar past incidents via TF-IDF
      2. Inject them into the system prompt as "memory"
      3. LLM produces diagnosis informed by historical patterns
      4. Parse structured JSON response

    This is the recursive learning loop:
      resolve incident → save to runbook → next incident reads runbook
      → better diagnosis → save again → continuously improving.
    """
    safe_logs = _truncate_logs(payload.logs)

    # ── RAG Retrieval (the magic) ──
    rag_entries = await asyncio.to_thread(
        get_relevant_runbook_entries, safe_logs
    )
    system_prompt = _build_sre_system_prompt(rag_entries)

    user_msg = (
        f"Incident ID : {payload.incident_id}\n"
        f"Container   : {payload.container_name or 'unknown'}\n"
        f"Alert Type  : {payload.alert_type}\n"
        f"Severity    : {payload.severity or 'UNKNOWN'}\n"
        f"Logs (last {LOG_TRUNCATE_CHARS} chars):\n{safe_logs}"
    )

    raw = await _call_llm(system_prompt, user_msg)
    data = _parse_json(raw)
    analysis = AIAnalysis(**data)

    # Normalize confidence to 0.0-1.0 range in case the LLM returned
    # an absolute or percentage-like number (e.g. 80, 800). Heuristics:
    # - If confidence > 1 and <= 100, assume percentage and divide by 100
    # - If confidence > 100 and <= 1000, assume per-mille and divide by 1000
    # - Otherwise clamp to [0,1]
    try:
        conf = float(analysis.confidence)
        if conf > 1.0 and conf <= 100.0:
            conf = conf / 100.0
        elif conf > 100.0 and conf <= 1000.0:
            conf = conf / 1000.0
        conf = max(0.0, min(1.0, conf))
        analysis.confidence = conf
    except Exception:
        analysis.confidence = float(0.0)

    # Sanitize free-text fields to correct common misspellings/formatting
    analysis.root_cause = _sanitize_text(getattr(analysis, 'root_cause', '') or '')
    analysis.justification = _sanitize_text(getattr(analysis, 'justification', '') or '')

    rag_tag = f" (RAG: {len(rag_entries)} entries)" if rag_entries else " (cold start)"
    logger.info(
        "🧠 SRE Agent ➜ cause=%s action=%s conf=%.2f%s",
        analysis.root_cause, analysis.action.value, analysis.confidence, rag_tag,
    )
    return analysis


# ═══════════════════════════════════════════════════════════════════════
# ⑤ MULTI-AGENT COUNCIL (Security Officer + Auditor)
# ═══════════════════════════════════════════════════════════════════════

async def council_review(
    payload: IncidentPayload,
    analysis: AIAnalysis,
) -> CouncilDecision:
    """
    Multi-Agent Council: 3 agents vote on the proposed action.

    Agent A (SRE):              Already voted via analyze_logs
    Agent B (Security Officer): Reviews the plan for safety
    Agent C (Auditor):          Logs for compliance

    Requires 2/3 majority to proceed.
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
