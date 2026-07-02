"""Smoke tests for the agent graph (no model/network calls)."""

from riffle_agent.graph.build import _route, ask, classify_intent, explain, remediate

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

_CORS = {
    "id": "cors.origin_reflection",
    "title": "CORS reflects arbitrary Origin",
    "severity": "medium",
    "description": "Server reflects the request Origin.",
    "suite": "cors",
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


def test_route_free_form_question_goes_to_ask():
    # "which is worst" classifies as unknown (no scan/explain/fix keyword).
    state = {"intent": "unknown", "findings": [_FINDING]}
    assert _route(state) == "ask"


def test_route_explain_without_finding_id_falls_through_to_ask():
    state = {"intent": "explain", "findings": [_FINDING]}
    assert _route(state) == "ask"


def test_ask_answers_without_touching_findings():
    # A general question produces a prose answer and no display change (no notice).
    state = {
        "messages": [{"role": "user", "content": "give me an overview"}],
        "findings": [_FINDING, _CORS],
    }
    result = ask(state)
    assert "2 finding" in result["answer"]
    assert "notice" not in result


def test_ask_surfaces_most_severe_on_superlative():
    state = {
        "messages": [{"role": "user", "content": "which one is the worst?"}],
        "findings": [_CORS, _FINDING],
    }
    result = ask(state)
    # Highest severity (critical) finding is surfaced into the display.
    assert result["notice"]["findingId"] == "auth.jwt_alg_none"
    assert result["notice"]["severity"] == "critical"


def test_ask_surfaces_finding_named_by_suite():
    state = {
        "messages": [{"role": "user", "content": "anything about cors?"}],
        "findings": [_FINDING, _CORS],
    }
    result = ask(state)
    assert result["notice"]["findingId"] == "cors.origin_reflection"


def test_ask_with_no_findings_prompts_to_scan():
    state = {"messages": [{"role": "user", "content": "what did you find?"}], "findings": []}
    result = ask(state)
    assert "scan" in result["answer"].lower()
    assert "notice" not in result
