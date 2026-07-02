import type { ScanCompleteEvent } from "@riffle/types";

export function ScanSummary({ event }: { event: ScanCompleteEvent }) {
  return (
    <section
      className="mono"
      style={{
        background: "rgba(20,184,166,0.07)",
        border: "1px solid rgba(94,234,212,0.2)",
        borderRadius: 8,
        color: "var(--teal-light)",
        fontSize: "0.875rem",
        padding: "10px 16px",
      }}
    >
      Scan of {event.targetUrl} complete — {event.findingCount} finding(s) in {event.durationMs}
      ms.
    </section>
  );
}
