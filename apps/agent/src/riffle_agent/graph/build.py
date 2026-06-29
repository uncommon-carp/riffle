"""LangGraph assembly.

Graph shape (see ARCHITECTURE.md):

    classify_intent ──> scan | explain | remediate | re_scan ──> END

Each terminal node updates state with structured data; ``server.py`` translates
the run into the typed SSE events the frontend renders. Checkpointing
(``MemorySaver``) gives multi-turn memory without manual state plumbing.
"""

from __future__ import annotations

import re

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from riffle_agent.state import AgentState, Intent
from riffle_agent.tools.sentinel import run_scan

_URL_RE = re.compile(r"https?://\S+")
# Sentinel rule ids look like "auth.jwt_alg_none", "cors.origin_reflection".
_FINDING_RE = re.compile(r"\b([a-z]+\.[a-z0-9_]+)\b")


def classify_intent(state: AgentState) -> AgentState:
    """Cheap rule-based intent classification (scaffold).

    A real implementation would call ``get_model(...)`` with a classification
    prompt; rules keep the scaffold deterministic and dependency-free.
    """
    text = _last_user_text(state).lower()
    intent: Intent = "unknown"
    if "remediat" in text or "fix" in text:
        intent = "remediate"
    elif "explain" in text or "why" in text:
        intent = "explain"
    elif "re-scan" in text or "rescan" in text or "again" in text:
        intent = "re_scan"
    elif "scan" in text or _URL_RE.search(text):
        intent = "scan"

    raw = _last_user_text(state)
    update: AgentState = {"intent": intent}
    url = _URL_RE.search(raw)
    if url:
        update["target_url"] = url.group(0)
    # Match a finding id only outside any URL (a host like "example.com" would
    # otherwise look like a rule id).
    finding = _FINDING_RE.search(_URL_RE.sub(" ", raw))
    if finding:
        update["finding_id"] = finding.group(1)
    return update


def scan(state: AgentState) -> AgentState:
    target = state.get("target_url", "")
    return {"findings": run_scan(target)}


def explain(state: AgentState) -> AgentState:
    """Surface a finding's structured explanation — no model call.

    Sentinel already provides `description` + `whyItMatters` per rule, so we
    return the matched finding directly (fidelity over prose). The selected
    model could later elaborate on top of this.
    """
    finding = _find(state)
    if finding is None:
        return {"error": _no_finding_message(state)}
    return {"explanation": finding}


def remediate(state: AgentState) -> AgentState:
    """Surface a finding's structured remediation — no model call."""
    finding = _find(state)
    if finding is None:
        return {"error": _no_finding_message(state)}
    return {"remediation": finding}


def re_scan(state: AgentState) -> AgentState:
    # Re-run against the same target; auth/openapi tweaks would be threaded in here.
    target = state.get("target_url", "")
    return {"findings": run_scan(target)}


def _find(state: AgentState):
    """Look up the finding referenced by `finding_id` among prior scan results.

    Findings persist across turns via the checkpointer, so explain/remediate can
    reference a finding from an earlier scan. IDs are rule-level (may repeat per
    endpoint); the first match is representative for explanation/remediation.
    """
    finding_id = state.get("finding_id")
    if not finding_id:
        return None
    for finding in state.get("findings", []):
        if finding.get("id") == finding_id:
            return finding
    return None


def _no_finding_message(state: AgentState) -> str:
    finding_id = state.get("finding_id")
    if not finding_id:
        return "No finding id provided. Run a scan first, then reference a finding by id."
    return f"No finding '{finding_id}' in this session. Run a scan first, then reference it."


def _route(state: AgentState) -> str:
    intent = state.get("intent", "unknown")
    return intent if intent != "unknown" else "scan"


def _last_user_text(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages:
        return ""
    last = messages[-1]
    return getattr(last, "content", last.get("content", "") if isinstance(last, dict) else "")


def build_graph():
    """Build and compile the agent graph with an in-memory checkpointer."""
    builder = StateGraph(AgentState)

    builder.add_node("classify_intent", classify_intent)
    builder.add_node("scan", scan)
    builder.add_node("explain", explain)
    builder.add_node("remediate", remediate)
    builder.add_node("re_scan", re_scan)

    builder.set_entry_point("classify_intent")
    builder.add_conditional_edges(
        "classify_intent",
        _route,
        {
            "scan": "scan",
            "explain": "explain",
            "remediate": "remediate",
            "re_scan": "re_scan",
        },
    )
    for node in ("scan", "explain", "remediate", "re_scan"):
        builder.add_edge(node, END)

    return builder.compile(checkpointer=MemorySaver())
