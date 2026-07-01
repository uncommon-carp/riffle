import type { ExplanationEvent } from "@riffle/types";

export function ExplanationPanel({ event }: { event: ExplanationEvent }) {
  return (
    <section style={{ padding: 12 }}>
      <h3>
        {event.title} <small style={{ opacity: 0.6 }}>({event.findingId})</small>
      </h3>
      {event.owasp ? <p style={{ opacity: 0.6 }}>{event.owasp}</p> : null}
      <p>{event.description}</p>
      {event.whyItMatters ? (
        <p>
          <strong>Why it matters:</strong> {event.whyItMatters}
        </p>
      ) : null}
    </section>
  );
}
