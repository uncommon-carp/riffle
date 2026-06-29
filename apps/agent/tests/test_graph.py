"""Smoke tests for the agent graph (no model/network calls)."""

from riffle_agent.graph.build import classify_intent


def test_classify_scan_from_url():
    state = {"messages": [{"role": "user", "content": "scan https://example.com please"}]}
    result = classify_intent(state)
    assert result["intent"] == "scan"
    assert result["target_url"] == "https://example.com"


def test_classify_remediate_with_finding_id():
    state = {"messages": [{"role": "user", "content": "how do I fix RIFFLE-001?"}]}
    result = classify_intent(state)
    assert result["intent"] == "remediate"
    assert result["finding_id"] == "RIFFLE-001"


def test_classify_explain():
    state = {"messages": [{"role": "user", "content": "explain RIFFLE-002"}]}
    result = classify_intent(state)
    assert result["intent"] == "explain"
