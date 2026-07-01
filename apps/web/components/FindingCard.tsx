import type { Finding, Severity } from "@riffle/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--red)",
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--teal-light)",
  info: "var(--muted-light)",
};

export function FindingCard({ finding }: { finding: Finding }) {
  const accent = SEVERITY_COLOR[finding.severity];

  return (
    <article
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="mono"
          style={{
            color: accent,
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {finding.severity}
        </span>
        <span style={{ fontWeight: 600 }}>{finding.title}</span>
      </header>
      <small className="mono" style={{ color: "var(--muted)" }}>
        {finding.id}
        {finding.owasp ? ` · ${finding.owasp}` : ""}
      </small>
      <p style={{ color: "var(--muted-light)", margin: "8px 0 0" }}>{finding.description}</p>
    </article>
  );
}
