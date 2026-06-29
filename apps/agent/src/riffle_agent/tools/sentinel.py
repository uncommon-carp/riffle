"""Sentinel scanner tool.

Sentinel (``@uncommon-carp/sentinel``) is an npm package; the agent invokes it
out-of-process and parses its structured findings. This is a scaffold stub: the
subprocess call is wired but returns canned findings until Sentinel is
integrated.
"""

from __future__ import annotations

import json
import subprocess

from riffle_agent.state import Finding

# Flip to True once @uncommon-carp/sentinel is installed and the CLI is wired up.
_USE_REAL_SENTINEL = False


def run_scan(target_url: str) -> list[Finding]:
    """Run a Sentinel scan against ``target_url`` and return structured findings."""
    if not _USE_REAL_SENTINEL:
        return _stub_findings(target_url)

    # Expected shape: a CLI that prints a JSON array of findings to stdout.
    result = subprocess.run(
        ["npx", "@uncommon-carp/sentinel", "scan", "--json", target_url],
        capture_output=True,
        text=True,
        check=True,
    )
    raw = json.loads(result.stdout)
    return [
        Finding(
            id=item["id"],
            category=item["category"],
            severity=item["severity"],
            detail=item["detail"],
        )
        for item in raw
    ]


def _stub_findings(target_url: str) -> list[Finding]:
    return [
        Finding(
            id="RIFFLE-001",
            category="Broken Object Level Authorization",
            severity="high",
            detail=f"Endpoint on {target_url} exposes objects by sequential ID without ownership checks.",
        ),
        Finding(
            id="RIFFLE-002",
            category="Security Misconfiguration",
            severity="medium",
            detail="CORS policy reflects arbitrary Origin headers.",
        ),
    ]
