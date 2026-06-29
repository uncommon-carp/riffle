# Riffle Agent

Python / LangGraph orchestration service. Managed with [uv](https://docs.astral.sh/uv/).

## Setup

```bash
uv sync
```

## Run

```bash
uv run uvicorn riffle_agent.server:app --reload --port 8000
```

## Test / lint

```bash
uv run pytest
uv run ruff check .
```

## Structure

```
src/riffle_agent/
├── server.py          # FastAPI SSE endpoint (POST /agent/stream)
├── state.py           # AgentState (graph state + checkpoint shape)
├── graph/build.py     # StateGraph: classify_intent → scan|explain|remediate|re_scan
├── models/registry.py # runtime-swappable ChatModel resolver (Anthropic/OpenAI/Ollama)
└── tools/sentinel.py  # Sentinel scanner invocation (stubbed)
```

Remote models read API keys from the environment (`ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`); local models go through a running Ollama instance.
