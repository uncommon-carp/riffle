import type { ReactElement } from "react";
import { createElement } from "react";
import type { AgentEvent } from "@riffle/types";
import { FindingCard } from "@/components/FindingCard";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { RemediationSteps } from "@/components/RemediationSteps";
import { ScanSummary } from "@/components/ScanSummary";
import { ErrorBanner } from "@/components/ErrorBanner";

/**
 * Maps a single agent event to its UI component. This is the core of the
 * "generative UI" idea: the agent decides what renders by the event it emits.
 */
export function renderEvent(event: AgentEvent): ReactElement {
  switch (event.type) {
    case "finding":
      return createElement(FindingCard, { finding: event.finding });
    case "explanation":
      return createElement(ExplanationPanel, { event });
    case "remediation":
      return createElement(RemediationSteps, { event });
    case "scan_complete":
      return createElement(ScanSummary, { event });
    case "error":
      return createElement(ErrorBanner, { event });
    default: {
      // Exhaustiveness check — adding a new AgentEvent variant breaks the build here.
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/**
 * Reads an SSE ReadableStream from the BFF and invokes `onEvent` per parsed
 * AgentEvent. Minimal scaffold parser — assumes one JSON `data:` line per event.
 */
export async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith("data:")) {
        const payload = line.slice("data:".length).trim();
        if (payload) onEvent(JSON.parse(payload) as AgentEvent);
      }
    }
  }
}
