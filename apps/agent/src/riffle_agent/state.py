"""Graph state shared across nodes."""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages

Intent = Literal["scan", "explain", "remediate", "re_scan", "unknown"]


class Finding(TypedDict):
    id: str
    category: str
    severity: str
    detail: str


class AgentState(TypedDict, total=False):
    """State threaded through the graph and persisted by the checkpointer."""

    messages: Annotated[list, add_messages]
    intent: Intent
    target_url: str
    finding_id: str
    findings: list[Finding]
    selected_model: str
