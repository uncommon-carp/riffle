"""FastAPI server exposing the agent as an SSE stream.

The BFF POSTs to ``/agent/stream``; we run the graph and translate node outputs
into the typed events the frontend renders (``finding``, ``scan_complete``,
etc. — see ARCHITECTURE.md "Streaming Protocol" and packages/types).
"""

from __future__ import annotations

import json
import time
import uuid
from typing import AsyncIterator

from fastapi import FastAPI
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from riffle_agent.graph import build_graph

app = FastAPI(title="Riffle Agent")
_graph = build_graph()


class StreamRequest(BaseModel):
    input: str
    model: str = "claude"
    thread_id: str | None = None


def _sse(event: dict) -> dict:
    """Wrap a typed AgentEvent as an sse-starlette data payload."""
    return {"data": json.dumps(event)}


async def _run(req: StreamRequest) -> AsyncIterator[dict]:
    config = {"configurable": {"thread_id": req.thread_id or str(uuid.uuid4())}}
    state = {
        "messages": [{"role": "user", "content": req.input}],
        "selected_model": req.model,
    }
    started = time.monotonic()
    finding_count = 0
    target_url = ""

    try:
        # stream_mode="updates" yields {node_name: state_delta} as each node finishes.
        async for chunk in _graph.astream(state, config, stream_mode="updates"):
            for delta in chunk.values():
                if delta.get("target_url"):
                    target_url = delta["target_url"]
                for finding in delta.get("findings", []) or []:
                    finding_count += 1
                    yield _sse({"type": "finding", "finding": finding})

        yield _sse(
            {
                "type": "scan_complete",
                "targetUrl": target_url,
                "findingCount": finding_count,
                "durationMs": int((time.monotonic() - started) * 1000),
            }
        )
    except Exception as exc:  # noqa: BLE001 — surface any failure as an error event
        yield _sse({"type": "error", "message": str(exc)})


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/agent/stream")
async def stream(req: StreamRequest) -> EventSourceResponse:
    return EventSourceResponse(_run(req))
