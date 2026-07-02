# Architecture

Generative UI security agent powered by Sentinel findings. Users interact via natural language; the agent drives UI component rendering rather than returning raw text.

---

## Stack

| Layer    | Technology                           | Role                                             |
| -------- | ------------------------------------ | ------------------------------------------------ |
| Frontend | Next.js (App Router)                 | UI, streaming consumer, component rendering      |
| BFF      | Node.js / Express or Hono            | Auth, session, stream proxy                      |
| Agent    | Python / LangGraph                   | Orchestration, tool execution, model abstraction |
| Scanner  | Sentinel (`@uncommon-carp/sentinel`) | OWASP API security scanning                      |
| Target   | Anemone                              | Deliberately vulnerable API for development/demo |

---

## High-Level Data Flow

```
User Input
    │
    ▼
Next.js (App Router)
    │  fetch + ReadableStream
    ▼
Node.js BFF
    │  HTTP POST → SSE proxy
    ▼
LangGraph Agent
    ├── classify_intent
    ├── [scan | explain | remediate | re-scan]
    └── stream_events → structured tool output
            │
            ▼
        Sentinel (npm package)
            │
            ▼
        Anemone (target API)
```

---

## Layer Responsibilities

### Next.js Frontend

- Consumes streamed events via `useUIState` (Vercel AI SDK)
- Maps tool call names to React components (finding cards, remediation panels, etc.)
- Model selector UI — passes selected model identifier to BFF on each request
- No agent logic; purely a rendering consumer

### Node.js BFF

Thin layer. Responsibilities:

- JWT validation / session management
- Proxies SSE stream from LangGraph to frontend
- Injects model selection from client into upstream request
- Single point of egress control — frontend never talks directly to Python service

### LangGraph Agent

Core orchestration. Graph nodes:

- `classify_intent` — determines user intent from input
- `scan` — invokes Sentinel against a target URL
- `explain` — takes a finding ID, returns structured explanation
- `remediate` — takes a finding ID, returns structured remediation steps
- `re_scan` — re-runs scan with modified parameters (e.g. auth headers)
- `ask` — answers a free-form natural-language question about the current
  findings. This is the "inquire without interrupting the display" path: it
  emits a conversational `answer` (never a scan), and — only when the question
  points at a specific finding — a `notice` that surfaces that finding into the
  display. explain/remediate without a finding id fall through to `ask`.

Each terminal node emits structured output mapped to a UI component type, not free text.

Checkpointing provides conversation memory across turns without manual state management.

### Model Abstraction

LangGraph uses LangChain's `ChatModel` interface. Model is runtime-swappable:

- **Local**: Ollama (e.g. `llama3`, `mistral`) — fast, no egress, good for classification
- **Remote**: Anthropic Claude or OpenAI — stronger reasoning for remediation/explanation

Model selection passed per-request from the UI. Same graph, different model instance.

### Sentinel

Invoked as a tool node within the graph. Returns structured findings (finding ID, category, severity, detail). These findings are the primary data driving UI rendering — not summarized into prose.

---

## Streaming Protocol

```
LangGraph astream_events
    → Python yields SSE chunks
    → BFF proxies as SSE
    → Next.js ReadableStream
    → useUIState maps events to components
```

Event types the frontend handles:

| Event           | Component        | Region       |
| --------------- | ---------------- | ------------ |
| `scan_started`  | — (reset signal) | display      |
| `finding`       | FindingCard      | display      |
| `scan_complete` | ScanSummary      | display      |
| `notice`        | NoticePanel      | display      |
| `explanation`   | ExplanationPanel | conversation |
| `remediation`   | RemediationSteps | conversation |
| `answer`        | AnswerPanel      | conversation |
| `error`         | ErrorBanner      | conversation |

The frontend renders two regions. The **display canvas** holds scan results and
is reset by each new scan — the agent emits `scan_started` before the fresh
`finding` events, and the frontend clears the canvas on that signal. The
**conversation thread** is a persistent Q&A log that questions append to without
disturbing the display. A `notice` is the one exception: when the agent decides
a question is "worth surfacing," it pushes a callout into the display canvas
without resetting it.

---

## Monorepo Structure (proposed)

```
/
├── apps/
│   ├── web/          # Next.js frontend
│   └── bff/          # Node.js BFF
├── agent/            # Python LangGraph service
│   ├── graph/
│   ├── tools/
│   └── models/
└── packages/
    └── types/        # Shared event/finding type definitions (TypeScript)
```

Shared types package ensures BFF and frontend agree on event schemas emitted by the agent.

---

## Key Design Decisions

**Why a BFF?** Frontend isolation from the Python service. Auth lives in Node, not the agent. Keeps the LangGraph service stateless and independently deployable.

**Why LangGraph over raw tool-calling?** Sentinel's workflow has real conditional branching (intent → different tool paths). LangGraph's explicit graph model makes that branching observable and testable. Checkpointing is also useful for multi-turn scan sessions.

**Why structured output over prose?** Finding data is already structured. Passing it through an LLM summary loses fidelity and makes UI rendering harder. Agent emits typed events; UI renders them directly.

**Why model-swappable?** Classification tasks (intent detection) don't need a frontier model. Local Ollama keeps latency low and cost zero for cheap operations. Remote model reserved for explanation and remediation where reasoning quality matters.

---

## Development Targets

- **Anemone** — local scan target during development
- **LocalStack** (if needed) — mock any AWS dependencies
- Sentinel invoked directly as npm package from Python via subprocess or published container

---

## Out of Scope (v1)

- Authentication beyond local dev JWT stubs
- Multi-user sessions
- Persistent scan history
- Deployment infrastructure
