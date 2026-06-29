import type { RemediationEvent } from "@riffle/types";

export function RemediationSteps({ event }: { event: RemediationEvent }) {
  return (
    <section style={{ padding: 12 }}>
      <h3>
        Remediation: {event.title}{" "}
        <small style={{ opacity: 0.6 }}>({event.findingId})</small>
      </h3>
      <p>{event.remediation ?? "No remediation guidance provided."}</p>
    </section>
  );
}
