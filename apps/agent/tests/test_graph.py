"""Smoke tests for the agent graph (no model/network calls)."""

from riffle_agent.graph.build import classify_intent, explain, remediate

_FINDING = {
    "id": "auth.jwt_alg_none",
    "title": 'JWT accepts "alg: none"',
    "severity": "critical",
    "description": "Endpoint accepts unsigned JWTs.",
    "whyItMatters": "Attackers can forge tokens.",
    "remediation": "Reject the 'none' algorithm.",
    "owasp": "API2: Broken Authentication",
    "suite": "auth",
}


def test_classify_scan_from_url():
    state = {"messages": [{"role": "user", "content": "scan https://example.com please"}]}
    result = classify_intent(state)
    assert result["intent"] == "scan"
    assert result["target_url"] == "https://example.com"
    # A host in the URL must not be mistaken for a finding id.
    assert "finding_id" not in result


def test_classify_remediate_with_finding_id():
    state = {"messages": [{"role": "user", "content": "how do I fix auth.jwt_alg_none?"}]}
    result = classify_intent(state)
    assert result["intent"] == "remediate"
    assert result["finding_id"] == "auth.jwt_alg_none"


def test_classify_explain():
    state = {"messages": [{"role": "user", "content": "explain cors.origin_reflection"}]}
    result = classify_intent(state)
    assert result["intent"] == "explain"
    assert result["finding_id"] == "cors.origin_reflection"


def test_explain_surfaces_structured_fields():
    state = {"finding_id": "auth.jwt_alg_none", "findings": [_FINDING]}
    result = explain(state)
    assert result["explanation"]["whyItMatters"] == "Attackers can forge tokens."


def test_remediate_surfaces_structured_fields():
    state = {"finding_id": "auth.jwt_alg_none", "findings": [_FINDING]}
    result = remediate(state)
    assert result["remediation"]["remediation"] == "Reject the 'none' algorithm."


def test_explain_unknown_finding_returns_error():
    state = {"finding_id": "nope.not_here", "findings": [_FINDING]}
    result = explain(state)
    assert "error" in result
