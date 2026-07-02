"""LangGraph assembly.

Graph shape (see ARCHITECTURE.md):

    classify_intent ──> scan | explain | remediate | re_scan ──> END

Each terminal node updates state with structured data; ``server.py`` translates
the run into the typed SSE events the frontend renders. Checkpointing
(``MemorySaver``) gives multi-turn memory without manual state plumbing.
"""

from __future__ import annotations

import os
import re

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from riffle_agent.state import AgentState, Finding, Intent
from riffle_agent.tools.sentinel import run_scan

_URL_RE = re.compile(r"https?://\S+")
# Sentinel rule ids look like "auth.jwt_alg_none", "cors.origin_reflection".
_FINDING_RE = re.compile(r"\b([a-z]+\.[a-z0-9_]+)\b")

# Severity ranking for "which is worst" style questions and notice ordering.
_SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
# Sentinel suite names (see ../sentinel/FINDINGS.md) — used to resolve questions
# like "what about cors?" to the relevant finding.
_SUITES = ("auth", "cors", "headers", "injection", "inventory", "ratelimit")
# Words that signal the user wants the single most important finding surfaced.
_SUPERLATIVES = (
    "worst",
    "most critical",
    "most serious",
    "most severe",
    "biggest",
    "top",
    "priority",
    "first",
    "highest",
)
# Like SENTINEL_MODE: "stub" (default) answers deterministically from the
# findings so the agent runs with no model/API key; "model" calls the selected
# LangChain model for richer prose.
_ASK_MODE = os.environ.get("RIFFLE_ASK_MODE", "stub")


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


def ask(state: AgentState) -> AgentState:
    """Answer a free-form natural-language question about the current findings.

    This is the "inquire without interrupting the display" path: it produces a
    prose ``answer`` (conversation thread) and never re-runs a scan, so the
    display canvas is untouched. If the question points at a specific finding
    worth pulling into view, it also emits a ``notice`` — the display's only
    change outside of a scan.
    """
    question = _last_user_text(state)
    findings = state.get("findings", [])
    update: AgentState = {"answer": _answer(question, findings, state.get("selected_model"))}
    surfaced = _pick_notice(question, findings)
    if surfaced is not None:
        update["notice"] = surfaced
    return update


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


def _answer(question: str, findings: list[Finding], model_id: str | None) -> str:
    """Produce a natural-language answer to ``question`` about ``findings``.

    Stub mode (default) answers deterministically from the findings so the agent
    runs offline. Model mode asks the selected model, falling back to the stub
    answer on any failure (missing package/API key/network) — the feature must
    degrade gracefully, never break the stream.
    """
    if not findings:
        return (
            "There are no findings to discuss yet. Enter a URL to scan "
            "(e.g. \"scan https://example.com\") and I can walk you through the results."
        )

    if _ASK_MODE == "model":
        try:
            return _answer_with_model(question, findings, model_id)
        except Exception:  # noqa: BLE001 — any model failure falls back to the stub answer
            pass
    return _answer_stub(question, findings)


def _answer_stub(question: str, findings: list[Finding]) -> str:
    """Deterministic answer synthesized across the findings (no model call)."""
    focus = _pick_notice(question, findings)
    counts: dict[str, int] = {}
    for f in findings:
        sev = f.get("severity", "info")
        counts[sev] = counts.get(sev, 0) + 1
    by_sev = ", ".join(
        f"{counts[s]} {s}" for s in ("critical", "high", "medium", "low", "info") if counts.get(s)
    )
    lead = f"This scan surfaced {len(findings)} finding(s): {by_sev}."

    if focus is not None:
        finding = _find_by_id(findings, focus["findingId"])
        if finding is not None:
            detail = finding.get("whyItMatters") or finding.get("description", "")
            return (
                f"{lead} The one to look at is {finding['title']} "
                f"({finding['id']}, {finding['severity']}): {detail}"
            )
    return lead + " Ask about any one by id (e.g. \"explain auth.jwt_alg_none\") for detail."


def _answer_with_model(question: str, findings: list[Finding], model_id: str | None) -> str:
    """Ask the selected model, using the findings as grounding context."""
    from riffle_agent.models.registry import get_model

    context = "\n".join(
        f"- {f['id']} ({f.get('severity', '?')}): {f['title']} — {f.get('description', '')}"
        for f in findings
    )
    prompt = (
        "You are a security analyst. Answer the user's question using only the "
        "findings below. Be concise and specific; reference findings by id.\n\n"
        f"Findings:\n{context}\n\nQuestion: {question}"
    )
    response = get_model(model_id).invoke(prompt)
    text = getattr(response, "content", response)
    return text if isinstance(text, str) else str(text)


def _pick_notice(question: str, findings: list[Finding]) -> dict | None:
    """Decide whether a question warrants surfacing a finding into the display.

    Returns a notice dict ({message, findingId, severity}) when the question
    points at a specific finding — by id, by suite, or by asking for the most
    severe — otherwise ``None`` (a general question leaves the display alone).
    """
    if not findings:
        return None
    q = question.lower()

    # 1. Explicit finding id, e.g. "how bad is auth.jwt_alg_none".
    for finding in findings:
        if finding.get("id", "").lower() in q:
            return _notice_for(finding, "You asked about this finding")

    # 2. "worst" / "most critical" → the single highest-severity finding.
    if any(word in q for word in _SUPERLATIVES):
        finding = _most_severe(findings)
        if finding is not None:
            return _notice_for(finding, "Highest-severity finding in this scan")

    # 3. A suite name, e.g. "what about cors?" → worst finding in that suite.
    for suite in _SUITES:
        if suite in q:
            in_suite = [f for f in findings if f.get("suite") == suite]
            finding = _most_severe(in_suite)
            if finding is not None:
                return _notice_for(finding, f"Top {suite} finding")

    return None


def _notice_for(finding: Finding, reason: str) -> dict:
    return {
        "message": f"{reason}: {finding['title']}",
        "findingId": finding["id"],
        "severity": finding.get("severity", "info"),
    }


def _most_severe(findings: list[Finding]) -> Finding | None:
    if not findings:
        return None
    return max(findings, key=lambda f: _SEVERITY_ORDER.get(f.get("severity", "info"), 0))


def _find_by_id(findings: list[Finding], finding_id: str) -> Finding | None:
    for finding in findings:
        if finding.get("id") == finding_id:
            return finding
    return None


def _no_finding_message(state: AgentState) -> str:
    finding_id = state.get("finding_id")
    if not finding_id:
        return "No finding id provided. Run a scan first, then reference a finding by id."
    return f"No finding '{finding_id}' in this session. Run a scan first, then reference it."


def _route(state: AgentState) -> str:
    """Map the classified intent to a graph node.

    explain/remediate need a finding id to do their structured lookup; without
    one, the request is a free-form question, so it falls through to ``ask``.
    Anything unclassified is treated as a question too — ``ask`` handles the
    no-findings case with a helpful prompt to scan first.
    """
    intent = state.get("intent", "unknown")
    if intent in ("explain", "remediate") and not state.get("finding_id"):
        return "ask"
    if intent == "unknown":
        return "ask"
    return intent


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
    builder.add_node("ask", ask)

    builder.set_entry_point("classify_intent")
    builder.add_conditional_edges(
        "classify_intent",
        _route,
        {
            "scan": "scan",
            "explain": "explain",
            "remediate": "remediate",
            "re_scan": "re_scan",
            "ask": "ask",
        },
    )
    for node in ("scan", "explain", "remediate", "re_scan", "ask"):
        builder.add_edge(node, END)

    return builder.compile(checkpointer=MemorySaver())
