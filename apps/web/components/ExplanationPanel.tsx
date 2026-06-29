import type { ExplanationEvent } from "@riffle/types";

export function ExplanationPanel({ event }: { event: ExplanationEvent }) {
  return (
    <section style={{ padding: 12 }}>
      <h3>Explanation — {event.findingId}</h3>
      <p>{event.explanation}</p>
    </section>
  );
}
