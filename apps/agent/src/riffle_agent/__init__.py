"""Riffle LangGraph security agent."""

from pathlib import Path

from dotenv import load_dotenv

# Load the repo-root .env before any submodule reads configuration. Several
# modules capture env vars at import time (e.g. tools/sentinel.py reads
# SENTINEL_MODE), so this must run first — hence living in the package __init__.
# override=False means a shell export or the Makefile still wins over .env.
_REPO_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(_REPO_ROOT / ".env", override=False)
