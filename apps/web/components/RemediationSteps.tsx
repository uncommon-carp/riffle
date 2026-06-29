import type { RemediationEvent } from "@riffle/types";

export function RemediationSteps({ event }: { event: RemediationEvent }) {
  return (
    <section style={{ padding: 12 }}>
      <h3>Remediation — {event.findingId}</h3>
      <ol>
        {event.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
