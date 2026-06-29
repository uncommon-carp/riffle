"use client";

import { useState } from "react";
import type { AgentEvent } from "@riffle/types";
import { renderEvent } from "@/lib/event-stream";

const MODELS = [
  { id: "claude", label: "Claude (remote)" },
  { id: "gpt-4o", label: "GPT-4o (remote)" },
  { id: "llama3", label: "Llama 3 (local)" },
] as const;

export default function Home() {
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [input, setInput] = useState("");
  // Scaffold placeholder: events would be populated from the BFF SSE stream.
  const [events] = useState<AgentEvent[]>([]);

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
          // TODO: POST { input, model } to the BFF and stream the response.
        }}
        style={{ marginTop: 16 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. scan https://example.com"
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
