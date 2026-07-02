import type { NoticeEvent, Severity } from "@riffle/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--red)",
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--teal-light)",
  info: "var(--muted-light)",
};

/**
 * A callout the agent pushed into the display while answering a question — the
 * "worth surfacing" case. It draws attention to a finding already on the canvas
 * without resetting it (only a scan does that).
 */
export function NoticePanel({ event }: { event: NoticeEvent }) {
  return (
    <aside
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: 8,
        color: "var(--text)",
        padding: "12px 16px",
      }}
    >
      <span
        className="mono"
        style={{
          color: "var(--amber)",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Surfaced
      </span>
      {event.severity ? (
        <span
          className="mono"
          style={{ color: SEVERITY_COLOR[event.severity], fontSize: "0.7rem", marginLeft: 8 }}
        >
          {event.severity}
        </span>
      ) : null}
      <p style={{ margin: "6px 0 0" }}>
        {event.message}
        {event.findingId ? (
          <small className="mono" style={{ color: "var(--muted)" }}> ({event.findingId})</small>
        ) : null}
      </p>
    </aside>
  );
}
