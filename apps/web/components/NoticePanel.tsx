import type { NoticeEvent } from "@riffle/types";

/**
 * A callout the agent pushed into the display while answering a question — the
 * "worth surfacing" case. It draws attention to a finding already on the canvas
 * without resetting it (only a scan does that).
 */
export function NoticePanel({ event }: { event: NoticeEvent }) {
  return (
    <aside
      style={{
        padding: 12,
        border: "1px solid #d9a441",
        background: "#fff8ec",
        borderRadius: 8,
      }}
    >
      <strong>Surfaced</strong>
      {event.severity ? ` · ${event.severity}` : ""} — {event.message}
      {event.findingId ? (
        <small style={{ opacity: 0.6 }}> ({event.findingId})</small>
      ) : null}
    </aside>
  );
}
