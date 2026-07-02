"use client";

import { useState } from "react";
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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Riffle</h1>
      <p>Generative UI security agent.</p>

      <label>
        Model:{" "}
        <select value={model} onChange={(e) => setModel(e.target.value)}>
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scan a URL, or ask about the findings…"
          disabled={pending}
          style={{ width: "100%", padding: 8 }}
        />
      </form>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14, textTransform: "uppercase", opacity: 0.6 }}>Findings</h2>
        {displayEvents.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No scan yet. Enter a URL to scan.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {displayEvents.map((event, i) => (
              <div key={i}>{renderEvent(event)}</div>
            ))}
          </div>
        )}
      </section>

      {conversation.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 14, textTransform: "uppercase", opacity: 0.6 }}>Conversation</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {conversation.map((event, i) =>
              event.type === "user" ? (
                <p key={i} style={{ margin: 0, fontWeight: 600 }}>
                  {event.text}
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
