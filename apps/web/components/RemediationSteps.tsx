import type { RemediationEvent } from "@riffle/types";

export function RemediationSteps({ event }: { event: RemediationEvent }) {
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
      <h3 style={{ margin: 0, color: "var(--green)" }}>
        Remediation: {event.title}{" "}
        <small className="mono" style={{ color: "var(--muted)", fontWeight: 400 }}>
          ({event.findingId})
        </small>
      </h3>
      <p style={{ color: "var(--muted-light)", margin: "8px 0 0" }}>
        {event.remediation ?? "No remediation guidance provided."}
      </p>
    </section>
  );
}
