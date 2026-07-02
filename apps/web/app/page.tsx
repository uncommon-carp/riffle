"use client";

import { useState, type CSSProperties } from "react";
import type { AgentEvent, DisplayEvent, ConversationEvent } from "@riffle/types";
import { isDisplayEvent } from "@riffle/types";
import { consumeEventStream, renderEvent } from "@/lib/event-stream";

const MODELS = [
  { id: "claude", label: "Claude (remote)" },
  { id: "gpt-4o", label: "GPT-4o (remote)" },
  { id: "llama3", label: "Llama 3 (local)" },
] as const;

// Dev-only: the BFF's JWT stub (see apps/bff/src/auth.ts). Real auth is v1 out
// of scope per ARCHITECTURE.md.
const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:3001";
const DEV_JWT = process.env.NEXT_PUBLIC_DEV_JWT ?? "dev-token";

// Shared style for the region headings ("Findings" / "Conversation").
const SECTION_HEADING: CSSProperties = {
  color: "var(--muted-light)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: 0,
  textTransform: "uppercase",
};

// The conversation thread interleaves the agent's replies with a local echo of
// what the user typed. The echo is a frontend-only concern, so it lives here
// rather than in the shared agent event contract.
type UserMessage = { type: "user"; text: string };
type ThreadItem = ConversationEvent | UserMessage;

// A stable id for this browser session. The agent keys its conversation memory
// (checkpointed scan findings) on this, so follow-up questions can reference an
// earlier scan. Persisted in sessionStorage so a reload keeps the same thread.
function useSessionId(): string {
  const [id] = useState(() => {
    if (typeof window === "undefined") return "";
    const KEY = "riffle-session-id";
    let existing = window.sessionStorage.getItem(KEY);
    if (!existing) {
      existing = crypto.randomUUID();
      window.sessionStorage.setItem(KEY, existing);
    }
    return existing;
  });
  return id;
}

export default function Home() {
  const sessionId = useSessionId();
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [input, setInput] = useState("");
  // Two regions. The display canvas holds scan results and is reset by each new
  // scan (via the `scan_started` signal). The conversation thread is a
  // persistent Q&A log that questions append to without disturbing the display.
  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([]);
  const [conversation, setConversation] = useState<ThreadItem[]>([]);
  const [pending, setPending] = useState(false);

  function handleEvent(event: AgentEvent) {
    // A scan clears the canvas before its findings stream in.
    if (event.type === "scan_started") {
      setDisplayEvents([]);
      return;
    }
    if (isDisplayEvent(event)) {
      setDisplayEvents((prev) => [...prev, event]);
    } else {
      setConversation((prev) => [...prev, event]);
    }
  }

  async function sendMessage(text: string) {
    setPending(true);
    // Echo the user's message into the conversation thread so questions read as
    // a dialogue. Scans still reset the display; this log is separate.
    setConversation((prev) => [...prev, { type: "user", text }]);
    try {
      const res = await fetch(`${BFF_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEV_JWT}`,
        },
        body: JSON.stringify({ input: text, model, sessionId }),
      });

      if (!res.ok || !res.body) {
        handleEvent({ type: "error", message: `Request failed (${res.status})` });
        return;
      }

      await consumeEventStream(res.body, handleEvent);
    } catch (err) {
      handleEvent({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Riffle
        </h1>
        <p style={{ color: "var(--muted-light)", margin: "4px 0 0" }}>
          Generative UI security agent, powered by{" "}
          <span style={{ color: "var(--teal-light)" }}>Sentinel</span> findings.
        </p>
      </header>

      <label
        style={{
          alignItems: "center",
          color: "var(--muted-light)",
          display: "flex",
          fontSize: "0.875rem",
          gap: 8,
        }}
      >
        Model
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mono"
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "6px 10px",
          }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || pending) return;
          setInput("");
          void sendMessage(text);
        }}
        style={{ marginTop: 16 }}
      >
        <div
          style={{
            alignItems: "center",
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            display: "flex",
            gap: 8,
            padding: "10px 14px",
          }}
        >
          <span className="mono" style={{ color: "var(--teal)" }}>
            $
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scan a URL, or ask about the findings…"
            disabled={pending}
            className="mono"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text)",
              flex: 1,
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          {pending ? (
            <span className="mono" style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              running…
            </span>
          ) : null}
        </div>
      </form>

      <section style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <h2 style={SECTION_HEADING}>Findings</h2>
        {displayEvents.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No scan yet. Enter a URL to scan.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {displayEvents.map((event, i) => (
              <div key={i}>{renderEvent(event)}</div>
            ))}
          </div>
        )}
      </section>

      {conversation.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
          <h2 style={SECTION_HEADING}>Conversation</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {conversation.map((event, i) =>
              event.type === "user" ? (
                <p
                  key={i}
                  className="mono"
                  style={{ color: "var(--text)", fontSize: "0.9rem", margin: 0 }}
                >
                  <span style={{ color: "var(--teal)" }}>$</span> {event.text}
                </p>
              ) : (
                <div key={i}>{renderEvent(event)}</div>
              ),
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
