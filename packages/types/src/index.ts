/**
 * Shared event/finding contract between the agent, BFF, and frontend.
 *
 * The agent emits typed events (not prose); the frontend maps each event
 * `type` to a React component. See ARCHITECTURE.md "Streaming Protocol".
 *
 * The `Finding` shape mirrors Sentinel's (`@uncommon-carp/sentinel`
 * src/core/types.ts) so finding data flows through untransformed — the
 * architecture's "structured output over prose" principle. In particular,
 * Sentinel already provides `whyItMatters` and `remediation` per finding, so
 * the explain/remediate nodes surface those directly rather than calling a model.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

/** A single endpoint affected by a finding (from Sentinel `evidence.affected`). */
export interface AffectedEndpoint {
  method: string;
  path: string;
  url: string;
  status: number;
}

/**
 * A security finding produced by Sentinel.
 *
 * NOTE: `id` is a *rule* id (e.g. "auth.jwt_alg_none"), not unique per run — the
 * same rule fires once per affected endpoint. The distinguishing detail lives in
 * `evidence`. `whyItMatters` / `remediation` are rule-level, so explaining or
 * remediating by `id` is well-defined.
 */
export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  whyItMatters?: string;
  remediation?: string;
  /** OWASP API category, e.g. "API2: Broken Authentication". */
  owasp?: string;
  evidence?: Record<string, unknown>;
  tags?: string[];
  /** The Sentinel suite that produced the finding (e.g. "auth", "cors"). */
  suite: string;
}

/** Maps to FindingCard. */
export interface FindingEvent {
  type: "finding";
  finding: Finding;
}

/** Maps to ExplanationPanel — sourced from the finding's structured fields. */
export interface ExplanationEvent {
  type: "explanation";
  findingId: string;
  title: string;
  description: string;
  whyItMatters?: string;
  owasp?: string;
}

/** Maps to RemediationSteps — sourced from the finding's `remediation`. */
export interface RemediationEvent {
  type: "remediation";
  findingId: string;
  title: string;
  remediation?: string;
}

/**
 * Emitted at the start of a scan, before any `finding`. Tells the frontend to
 * reset the display canvas — a new scan replaces the previous results rather
 * than appending to them. Questions (explain/remediate/answer) never emit this,
 * so inquiring about findings leaves the display intact.
 */
export interface ScanStartedEvent {
  type: "scan_started";
  targetUrl: string;
}

/** Maps to ScanSummary. */
export interface ScanCompleteEvent {
  type: "scan_complete";
  targetUrl: string;
  findingCount: number;
  durationMs: number;
}

/**
 * A natural-language answer to a free-form question about the current findings.
 * Maps to AnswerPanel and lands in the conversation thread — it does NOT reset
 * the display. Unlike explanation/remediation (which surface a single finding's
 * structured fields verbatim), this is prose synthesized across findings.
 */
export interface AnswerEvent {
  type: "answer";
  text: string;
  /** Set when the answer is about one specific finding. */
  findingId?: string;
}

/**
 * The agent pulling something into the display while answering a question —
 * the "unless the agent sees something worth surfacing" case. Appends a
 * highlighted callout to the display canvas without resetting it. Maps to
 * NoticePanel.
 */
export interface NoticeEvent {
  type: "notice";
  message: string;
  /** The finding this notice draws attention to, if any. */
  findingId?: string;
  severity?: Severity;
}

/** Maps to ErrorBanner. */
export interface ErrorEvent {
  type: "error";
  message: string;
}

/** Discriminated union of every event the agent can stream. */
export type AgentEvent =
  | ScanStartedEvent
  | FindingEvent
  | ExplanationEvent
  | RemediationEvent
  | ScanCompleteEvent
  | AnswerEvent
  | NoticeEvent
  | ErrorEvent;

/**
 * Events that belong to the display canvas (reset on each scan) vs. the
 * conversation thread (a persistent Q&A log). `scan_started` is neither — it's
 * a control signal that clears the canvas.
 */
export type DisplayEvent = FindingEvent | ScanCompleteEvent | NoticeEvent;
export type ConversationEvent =
  | ExplanationEvent
  | RemediationEvent
  | AnswerEvent
  | ErrorEvent;

const DISPLAY_TYPES: ReadonlySet<AgentEventType> = new Set([
  "finding",
  "scan_complete",
  "notice",
]);

/** True for events that render in the display canvas. */
export function isDisplayEvent(event: AgentEvent): event is DisplayEvent {
  return DISPLAY_TYPES.has(event.type);
}

/** The discriminant values, handy for exhaustive switches and tests. */
export type AgentEventType = AgentEvent["type"];
