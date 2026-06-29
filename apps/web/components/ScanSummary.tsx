import type { ScanCompleteEvent } from "@riffle/types";

export function ScanSummary({ event }: { event: ScanCompleteEvent }) {
  return (
    <section style={{ padding: 12, fontWeight: 600 }}>
      Scan of {event.targetUrl} complete — {event.findingCount} finding(s) in{" "}
      {event.durationMs}ms.
    </section>
  );
}
