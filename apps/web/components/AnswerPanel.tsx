import type { AnswerEvent } from "@riffle/types";

/**
 * A natural-language answer in the conversation thread. Unlike the structured
 * panels, this is prose the agent synthesized across findings — it renders here
 * without touching the scan display.
 */
export function AnswerPanel({ event }: { event: AnswerEvent }) {
  return (
    <section
      style={{
        padding: 12,
        borderLeft: "3px solid #4a7",
        background: "#f6faf7",
        borderRadius: 4,
      }}
    >
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{event.text}</p>
      {event.findingId ? (
        <small style={{ opacity: 0.6 }}>re: {event.findingId}</small>
      ) : null}
    </section>
  );
}
