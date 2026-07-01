import type { ErrorEvent } from "@riffle/types";

export function ErrorBanner({ event }: { event: ErrorEvent }) {
  return (
    <div
      style={{
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.3)",
        borderRadius: 8,
        color: "var(--red)",
        padding: "10px 16px",
      }}
    >
      {event.message}
    </div>
  );
}
