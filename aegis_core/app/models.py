"""
AegisOps – Pydantic schemas for the Autonomous SRE Agent.
"""

from __future__ import annotations

import datetime as _dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Incoming webhook from OpenTelemetry Collector ────────────────────
class IncidentPayload(BaseModel):
    incident_id: str = Field(..., description="Unique alert identifier")
    alert_type: str = Field(..., description="Category, e.g. 'Memory Leak'")
    logs: str = Field(..., description="Raw log snippet forwarded by the collector")


# ── Gemini's structured response ─────────────────────────────────────
class ActionType(str, Enum):
    RESTART = "RESTART"
    SCALE_UP = "SCALE_UP"
    ROLLBACK = "ROLLBACK"
    NOOP = "NOOP"


class AIAnalysis(BaseModel):
    root_cause: str = Field(..., description="One-line root cause summary")
    action: ActionType = Field(..., description="Recommended remediation action")
    justification: str = Field(..., description="Why this action was chosen")


# ── Resolution tracking ──────────────────────────────────────────────
class ResolutionStatus(str, Enum):
    ANALYSING = "ANALYSING"
    EXECUTING = "EXECUTING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"


class IncidentResult(BaseModel):
    incident_id: str
    alert_type: str
    analysis: Optional[AIAnalysis] = None
    status: ResolutionStatus = ResolutionStatus.ANALYSING
    resolved_at: Optional[str] = None
    error: Optional[str] = None


# ── Runbook entry (learning) ─────────────────────────────────────────
class RunbookEntry(BaseModel):
    incident_id: str
    alert_type: str
    root_cause: str
    action: str
    justification: str
    resolved_at: str = Field(
        default_factory=lambda: _dt.datetime.utcnow().isoformat()
    )
