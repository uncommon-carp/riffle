# Riffle

Generative UI security agent powered by Sentinel findings. Users interact in
natural language; the agent drives UI component rendering rather than returning
raw text. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Layout

```
apps/web      Next.js frontend (App Router, Vercel AI SDK)
apps/bff      Node BFF (Hono) — auth + SSE proxy
apps/agent    Python LangGraph agent (uv)
packages/types  Shared TS event/finding contract (@riffle/types)
```

The JS side uses **npm workspaces**; the Python agent uses **uv**. Tasks are
orchestrated with plain `npm` scripts + a `Makefile` — no monorepo framework.

## Prerequisites

- Node.js >= 22
- Python >= 3.12
- [uv](https://docs.astral.sh/uv/)

## Quickstart

```bash
make install   # npm install + uv sync
make dev       # web :3000, bff :3001, agent :8000
```

Run `make help` for all targets. Individual services: `make dev-web`,
`make dev-bff`, `make dev-agent`.

## Data flow

```
web (:3000) ──POST /api/chat──> bff (:3001) ──POST /agent/stream──> agent (:8000)
     ▲                                                                    │
     └──────────────── SSE: typed AgentEvents ◄───────────────────────────┘
```

Events are defined once in `packages/types` and rendered to components by
`apps/web`. They split into two regions: **display** (`scan_started`, `finding`,
`scan_complete`, `notice`) — a canvas reset by each scan — and **conversation**
(`explanation`, `remediation`, `answer`, `error`) — a persistent Q&A thread.
Scanning resets the display; asking questions appends to the conversation
without disturbing it, unless the agent surfaces a `notice`.

## Verify

```bash
# Agent directly
curl -N -X POST localhost:8000/agent/stream \
  -H 'Content-Type: application/json' \
  -d '{"input":"scan https://example.com","model":"claude"}'

# Through the BFF (dev JWT stub)
curl -N -X POST localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-token' \
  -d '{"input":"scan https://example.com","model":"claude"}'
```
