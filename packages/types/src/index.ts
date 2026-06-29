/**
 * Shared event/finding contract between the agent, BFF, and frontend.
 *
 * The agent emits typed events (not prose); the frontend maps each event
 * `type` to a React component. See ARCHITECTURE.md "Streaming Protocol".
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

/** A single security finding produced by Sentinel. */
export interface Finding {
  id: string;
  category: string;
  severity: Severity;
  detail: string;
}

/** Maps to FindingCard. */
export interface FindingEvent {
  type: "finding";
  finding: Finding;
}

/** Maps to ExplanationPanel. */
export interface ExplanationEvent {
  type: "explanation";
  findingId: string;
  explanation: string;
}

/** Maps to RemediationSteps. */
export interface RemediationEvent {
  type: "remediation";
  findingId: string;
  steps: string[];
}

/** Maps to ScanSummary. */
export interface ScanCompleteEvent {
  type: "scan_complete";
  targetUrl: string;
  findingCount: number;
  durationMs: number;
}

/** Maps to ErrorBanner. */
export interface ErrorEvent {
  type: "error";
  message: string;
}

/** Discriminated union of every event the agent can stream. */
export type AgentEvent =
  | FindingEvent
  | ExplanationEvent
  | RemediationEvent
  | ScanCompleteEvent
  | ErrorEvent;

/** The discriminant values, handy for exhaustive switches and tests. */
export type AgentEventType = AgentEvent["type"];
