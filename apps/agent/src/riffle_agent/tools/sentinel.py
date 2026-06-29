"""Sentinel scanner tool.

Sentinel (``@uncommon-carp/sentinel``, v0.4.0) is an npm CLI. The agent invokes
it out-of-process and reads the JSON report it writes.

CLI contract (from the Sentinel repo):
  - Invocation: ``sentinel scan -u <url> -o <dir> [--openapi <pathOrUrl>] [-c <config>]``
    There is NO ``--json`` flag and NO positional URL; ``-u`` (or the
    ``TARGET_URL`` env var) sets the target.
  - Output: a full ``RunResult`` is written to ``<dir>/sentinel-report.json``
    (and ``sentinel-report.md``). Findings are at ``RunResult.findings``.
  - Exit codes: 0 = clean, 1 = incomplete (suite errors), 2 = high/critical
    findings present, 3 = fatal. Codes 0–2 are all successful scans — only 3
    (and other nonzero) indicate the scan itself failed to run.
  - Auth (for re-scans) is config-file based: write a temp ``sentinel.config.json``
    with an ``auth`` block and pass it via ``-c``. ``-u`` still supplies baseUrl.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from riffle_agent.state import Finding

# "stub" (default) returns canned findings so the agent runs with no Sentinel
# install or live target; "real" shells out to the Sentinel CLI.
_MODE = os.environ.get("SENTINEL_MODE", "stub")
# How to invoke the CLI. Default fetches/runs the published package via npx.
_SENTINEL_BIN = os.environ.get("SENTINEL_BIN", "npx --yes @uncommon-carp/sentinel")
# Exit code 3 (and up) means the scan failed to run; 0–2 are valid outcomes.
_FATAL_EXIT = 3


def run_scan(
    target_url: str,
    *,
    openapi: str | None = None,
    auth: dict[str, Any] | None = None,
) -> list[Finding]:
    """Run a Sentinel scan against ``target_url`` and return structured findings.

    ``auth`` is a Sentinel auth block (e.g. ``{"type": "bearer", "bearerToken": "..."}``)
    used by re-scans; values may use ``${ENV_VAR}`` placeholders that Sentinel expands.
    """
    if _MODE != "real":
        return _stub_findings(target_url)

    with tempfile.TemporaryDirectory(prefix="riffle-sentinel-") as tmp:
        out_dir = Path(tmp)
        cmd = [*_SENTINEL_BIN.split(), "scan", "-u", target_url, "-o", str(out_dir)]
        if openapi:
            cmd += ["--openapi", openapi]
        if auth:
            config_path = out_dir / "sentinel.config.json"
            config_path.write_text(json.dumps({"auth": auth}))
            cmd += ["-c", str(config_path)]

        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode >= _FATAL_EXIT:
            raise RuntimeError(
                f"sentinel scan failed (exit {proc.returncode}): {proc.stderr.strip() or proc.stdout.strip()}"
            )

        report_path = out_dir / "sentinel-report.json"
        if not report_path.exists():
            raise RuntimeError(f"sentinel produced no report at {report_path}")

        report = json.loads(report_path.read_text())

    return [_to_finding(item) for item in report.get("findings", [])]


def _to_finding(raw: dict[str, Any]) -> Finding:
    """Project a Sentinel finding onto our Finding (shapes are aligned)."""
    finding: Finding = {
        "id": raw["id"],
        "title": raw["title"],
        "severity": raw["severity"],
        "description": raw["description"],
        "suite": raw.get("suite", ""),
    }
    for key in ("whyItMatters", "remediation", "owasp", "evidence", "tags"):
        if raw.get(key) is not None:
            finding[key] = raw[key]  # type: ignore[literal-required]
    return finding


def _stub_findings(target_url: str) -> list[Finding]:
    """Canned findings matching the real Sentinel shape (for stub mode)."""
    return [
        {
            "id": "auth.jwt_alg_none",
            "title": 'JWT accepts "alg: none"',
            "severity": "critical",
            "description": f"An endpoint on {target_url} accepts JWTs signed with the 'none' algorithm.",
            "whyItMatters": "An attacker can forge tokens with arbitrary claims, bypassing authentication entirely.",
            "remediation": "Reject the 'none' algorithm; pin verification to your expected signing algorithm.",
            "owasp": "API2: Broken Authentication",
            "suite": "auth",
            "tags": ["auth", "jwt"],
        },
        {
            "id": "cors.origin_reflection",
            "title": "CORS reflects arbitrary Origin",
            "severity": "medium",
            "description": "The server reflects the request Origin in Access-Control-Allow-Origin.",
            "whyItMatters": "Combined with credentialed requests, any site can read authenticated responses.",
            "remediation": "Validate Origin against an allowlist; never reflect it unconditionally.",
            "owasp": "API8: Security Misconfiguration",
            "suite": "cors",
            "tags": ["cors", "http"],
        },
    ]
