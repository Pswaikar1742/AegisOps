"""
AegisOps GOD MODE – Pydantic schemas.

Multi-Agent Council · Auto-Scaling · WebSocket frames · Live metrics.
"""

from __future__ import annotations

import datetime as _dt
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Incoming webhook ─────────────────────────────────────────────────
class IncidentPayload(BaseModel):
    model_config = {"extra": "allow"}

    incident_id: str = Field(..., description="Unique alert identifier")
    alert_type: str = Field(..., description="Category, e.g. 'Memory Leak'")
    logs: str = Field(default="", description="Raw log snippet")
    container_name: Optional[str] = None
    severity: Optional[str] = None
    timestamp: Optional[str] = None


# ── LLM structured response ──────────────────────────────────────────
class ActionType(str, Enum):
    RESTART = "RESTART"
    SCALE_UP = "SCALE_UP"
    SCALE_DOWN = "SCALE_DOWN"
    ROLLBACK = "ROLLBACK"
    NOOP = "NOOP"


class AIAnalysis(BaseModel):
    root_cause: str = Field(..., description="One-line root cause summary")
    action: ActionType = Field(..., description="Recommended remediation action")
    justification: str = Field(..., description="Why this action was chosen")
    confidence: float = Field(default=0.85, description="0-1 confidence score")
    replica_count: int = Field(default=2, description="Desired replicas for SCALE_UP")


# ── Multi-Agent Council ──────────────────────────────────────────────
class CouncilRole(str, Enum):
    SRE_AGENT = "SRE_AGENT"
    SECURITY_OFFICER = "SECURITY_OFFICER"
    AUDITOR = "AUDITOR"


class CouncilVerdict(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class CouncilVote(BaseModel):
    role: CouncilRole
    verdict: CouncilVerdict
    reasoning: str
    timestamp: str = Field(default_factory=lambda: _dt.datetime.utcnow().isoformat())


class CouncilDecision(BaseModel):
    votes: list[CouncilVote] = Field(default_factory=list)
    final_verdict: CouncilVerdict = CouncilVerdict.NEEDS_REVIEW
    consensus: bool = False
    summary: str = ""


# ── Resolution tracking ──────────────────────────────────────────────
class ResolutionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    ANALYSING = "ANALYSING"
    COUNCIL_REVIEW = "COUNCIL_REVIEW"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    SCALING = "SCALING"
    VERIFYING = "VERIFYING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"


class TimelineEntry(BaseModel):
    ts: str = Field(default_factory=lambda: _dt.datetime.utcnow().isoformat())
    status: str
    message: str
    agent: Optional[str] = None


class IncidentResult(BaseModel):
    incident_id: str
    alert_type: str
    analysis: Optional[AIAnalysis] = None
    council_decision: Optional[CouncilDecision] = None
    status: ResolutionStatus = ResolutionStatus.RECEIVED
    resolved_at: Optional[str] = None
    error: Optional[str] = None
    replicas_spawned: int = 0
    timeline: list[TimelineEntry] = Field(default_factory=list)


# ── Scaling events ───────────────────────────────────────────────────
class ScaleEvent(BaseModel):
    container_base: str
    replica_count: int
    replicas: list[str] = Field(default_factory=list)
    lb_configured: bool = False
    timestamp: str = Field(default_factory=lambda: _dt.datetime.utcnow().isoformat())


# ── WebSocket frame types ────────────────────────────────────────────
class WSFrameType(str, Enum):
    INCIDENT_NEW = "incident.new"
    STATUS_UPDATE = "status.update"
    AI_THINKING = "ai.thinking"
    AI_STREAM = "ai.stream"
    AI_COMPLETE = "ai.complete"
    COUNCIL_VOTE = "council.vote"
    COUNCIL_DECISION = "council.decision"
    DOCKER_ACTION = "docker.action"
    SCALE_EVENT = "scale.event"
    HEALTH_CHECK = "health.check"
    METRICS = "metrics"
    CONTAINER_LIST = "container.list"
    TOPOLOGY = "topology"
    RESOLVED = "resolved"
    FAILED = "failed"
    HEARTBEAT = "heartbeat"


class WSFrame(BaseModel):
    type: WSFrameType
    incident_id: Optional[str] = None
    data: Any = None
    timestamp: str = Field(default_factory=lambda: _dt.datetime.utcnow().isoformat())


# ── Runbook entry (RAG knowledge base) ───────────────────────────────
class RunbookEntry(BaseModel):
    """
    Each resolved incident is saved with FULL context so the TF-IDF
    vectorizer can build rich similarity scores for future retrieval.
    Fields: logs, container_name, severity feed the RAG corpus.
    """
    incident_id: str
    alert_type: str
    logs: str = ""                                  # ← raw logs for TF-IDF
    container_name: str = "unknown"                 # ← container context
    severity: str = "UNKNOWN"                       # ← severity context
    root_cause: str
    action: str
    justification: str
    confidence: float = 0.85                        # ← LLM confidence at resolution
    council_approved: bool = True
    replicas_used: int = 0
    resolved_at: str = Field(
        default_factory=lambda: _dt.datetime.utcnow().isoformat()
    )


# ── Container metrics ────────────────────────────────────────────────
class ContainerMetrics(BaseModel):
    name: str
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    memory_limit_mb: float = 0.0
    memory_percent: float = 0.0
    net_rx_bytes: int = 0
    net_tx_bytes: int = 0
    status: str = "unknown"
    uptime_seconds: float = 0.0
    image: str = ""
