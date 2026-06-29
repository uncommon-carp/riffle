import type { ErrorEvent } from "@riffle/types";

export function ErrorBanner({ event }: { event: ErrorEvent }) {
  return (
    <div style={{ padding: 12, background: "#fee", color: "#900", borderRadius: 8 }}>
      {event.message}
    </div>
  );
}
