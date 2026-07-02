"""Graph state shared across nodes."""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages

Intent = Literal["scan", "explain", "remediate", "re_scan", "ask", "unknown"]


class Finding(TypedDict, total=False):
    """Mirrors Sentinel's Finding (see @uncommon-carp/sentinel core/types.ts).

    ``id`` is a rule id (not unique per run); ``whyItMatters``/``remediation``
    are rule-level and feed the explain/remediate nodes directly.
    """

    id: str
    title: str
    severity: str
    description: str
    whyItMatters: str
    remediation: str
    owasp: str
    evidence: dict
    tags: list[str]
    suite: str


class AgentState(TypedDict, total=False):
    """State threaded through the graph and persisted by the checkpointer."""

    messages: Annotated[list, add_messages]
    intent: Intent
    target_url: str
    finding_id: str
    findings: list[Finding]
    explanation: Finding
    remediation: Finding
    # Free-form natural-language answer produced by the `ask` node.
    answer: str
    # A finding the `ask` node chose to surface into the display (the
    # "worth surfacing" case). Shape: {message, findingId, severity}.
    notice: dict
    error: str
    selected_model: str
