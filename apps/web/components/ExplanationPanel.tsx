import type { ExplanationEvent } from "@riffle/types";

export function ExplanationPanel({ event }: { event: ExplanationEvent }) {
  return (
    <section
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--teal)",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--teal-light)" }}>
        {event.title}{" "}
        <small className="mono" style={{ color: "var(--muted)", fontWeight: 400 }}>
          ({event.findingId})
        </small>
      </h3>
      {event.owasp ? (
        <p className="mono" style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: "0.8rem" }}>
          {event.owasp}
        </p>
      ) : null}
      <p style={{ color: "var(--muted-light)", margin: "8px 0 0" }}>{event.description}</p>
      {event.whyItMatters ? (
        <p
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 6,
            color: "var(--text)",
            margin: "12px 0 0",
            padding: "8px 12px",
          }}
        >
          <strong style={{ color: "var(--amber)" }}>Why it matters:</strong> {event.whyItMatters}
        </p>
      ) : null}
    </section>
  );
}
