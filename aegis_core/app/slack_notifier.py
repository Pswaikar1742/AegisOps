"""
AegisOps GOD MODE – Slack Block Kit notifications.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from .config import SLACK_WEBHOOK_URL
from .models import AIAnalysis, CouncilDecision, IncidentPayload, ResolutionStatus

logger = logging.getLogger("aegis.slack")

_STATUS_EMOJI = {
    ResolutionStatus.RECEIVED: "📨",
    ResolutionStatus.ANALYSING: "🔍",
    ResolutionStatus.COUNCIL_REVIEW: "🏛️",
    ResolutionStatus.APPROVED: "✅",
    ResolutionStatus.EXECUTING: "⚙️",
    ResolutionStatus.SCALING: "⚡",
    ResolutionStatus.VERIFYING: "🩺",
    ResolutionStatus.RESOLVED: "🎉",
    ResolutionStatus.FAILED: "❌",
}


async def notify(
    payload: IncidentPayload,
    status: ResolutionStatus,
    analysis: Optional[AIAnalysis] = None,
    council: Optional[CouncilDecision] = None,
    error: Optional[str] = None,
) -> None:
    if not SLACK_WEBHOOK_URL:
        return

    emoji = _STATUS_EMOJI.get(status, "ℹ️")

    blocks: list[dict] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji}  AegisOps GOD MODE – {status.value}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Incident:*\n`{payload.incident_id}`"},
                {"type": "mrkdwn", "text": f"*Alert Type:*\n{payload.alert_type}"},
            ],
        },
    ]

    if analysis:
        blocks.append({
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Root Cause:*\n{analysis.root_cause}"},
                {"type": "mrkdwn", "text": f"*Action:*\n`{analysis.action.value}` (conf: {analysis.confidence:.0%})"},
            ],
        })

    if council:
        vote_text = "\n".join(
            f"• *{v.role.value}*: {v.verdict.value} – _{v.reasoning[:80]}_"
            for v in council.votes
        )
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*🏛️ Council Votes:*\n{vote_text}"},
        })
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Final Verdict:* `{council.final_verdict.value}` | {council.summary}"},
        })

    if error:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Error:*\n```{error}```"},
        })

    blocks.append({"type": "divider"})

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(SLACK_WEBHOOK_URL, json={"blocks": blocks})
            if resp.status_code == 200:
                logger.info("📣 Slack → %s", status.value)
            else:
                logger.warning("Slack returned %d", resp.status_code)
    except httpx.RequestError as exc:
        logger.warning("Slack notification failed (non-fatal): %s", exc)
