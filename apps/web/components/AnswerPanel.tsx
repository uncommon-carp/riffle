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
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--green)",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <p style={{ color: "var(--text)", margin: 0, whiteSpace: "pre-wrap" }}>{event.text}</p>
      {event.findingId ? (
        <small className="mono" style={{ color: "var(--muted)" }}>
          re: {event.findingId}
        </small>
      ) : null}
    </section>
  );
}
