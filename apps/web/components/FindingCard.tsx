import type { Finding } from "@riffle/types";

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
      <header style={{ fontWeight: 600 }}>
        [{finding.severity}] {finding.category}
      </header>
      <small style={{ opacity: 0.6 }}>{finding.id}</small>
      <p>{finding.detail}</p>
    </article>
  );
}
