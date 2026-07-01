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
          placeholder="e.g. scan https://example.com"
          disabled={pending}
          style={{ width: "100%", padding: 8 }}
        />
      </form>

      <section style={{ marginTop: 24 }}>
        {events.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No events yet.</p>
        ) : (
          events.map((event, i) => <div key={i}>{renderEvent(event)}</div>)
        )}
      </section>
    </main>
  );
}
