"""
AegisOps – Slack notifications via Incoming Webhook.

Sends rich Block Kit messages to a Slack channel at each pipeline
stage: received → analysing → executing → resolved / failed.

If SLACK_WEBHOOK_URL is not set, all calls silently no-op.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from .config import SLACK_WEBHOOK_URL
from .models import AIAnalysis, IncidentPayload, ResolutionStatus

logger = logging.getLogger("aegis.slack")

# ── Emoji mapping ────────────────────────────────────────────────────
_STATUS_EMOJI = {
    ResolutionStatus.ANALYSING: "🔍",
    ResolutionStatus.EXECUTING: "⚙️",
    ResolutionStatus.RESOLVED: "✅",
    ResolutionStatus.FAILED: "❌",
}


async def notify(
    payload: IncidentPayload,
    status: ResolutionStatus,
    analysis: Optional[AIAnalysis] = None,
    error: Optional[str] = None,
) -> None:
    """
    Post a Slack message for this incident.

    Silently returns if SLACK_WEBHOOK_URL is empty or the POST fails
    (notifications must never crash the pipeline).
    """
    if not SLACK_WEBHOOK_URL:
        return

    emoji = _STATUS_EMOJI.get(status, "ℹ️")

    # ── Build the Slack Block Kit payload ─────────────────────────────
    blocks: list[dict] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji}  AegisOps – {status.value}",
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
        blocks.append(
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Root Cause:*\n{analysis.root_cause}"},
                    {"type": "mrkdwn", "text": f"*Action:*\n`{analysis.action.value}`"},
                ],
            }
        )
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Justification:*\n_{analysis.justification}_",
                },
            }
        )

    if error:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error:*\n```{error}```",
                },
            }
        )

    blocks.append({"type": "divider"})

    body = {"blocks": blocks}

    # ── Fire-and-forget POST ─────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(SLACK_WEBHOOK_URL, json=body)
            if resp.status_code == 200:
                logger.info("📣 Slack notified → %s", status.value)
            else:
                logger.warning(
                    "Slack webhook returned %d: %s", resp.status_code, resp.text,
                )
    except httpx.RequestError as exc:
        logger.warning("Slack notification failed (non-fatal): %s", exc)
