"use client";

import { useState } from "react";
import type { AgentEvent } from "@riffle/types";
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

export default function Home() {
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [input, setInput] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [pending, setPending] = useState(false);

  async function sendMessage(text: string) {
    setPending(true);
    try {
      const res = await fetch(`${BFF_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEV_JWT}`,
        },
        body: JSON.stringify({ input: text, model }),
      });

      if (!res.ok || !res.body) {
        setEvents((prev) => [
          ...prev,
          { type: "error", message: `Request failed (${res.status})` },
        ]);
        return;
      }

      await consumeEventStream(res.body, (event) => {
        setEvents((prev) => [...prev, event]);
      });
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        { type: "error", message: err instanceof Error ? err.message : String(err) },
      ]);
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
            placeholder="Paste a URL to scan, or ask to explain/fix a finding"
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
        {events.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No events yet.</p>
        ) : (
          events.map((event, i) => <div key={i}>{renderEvent(event)}</div>)
        )}
      </section>
    </main>
  );
}
