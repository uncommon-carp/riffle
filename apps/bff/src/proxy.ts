const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

/**
 * Forwards a request to the agent's SSE endpoint and returns the upstream
 * Response unchanged. The frontend never talks to the Python service directly
 * — this is the single point of egress control.
 */
export async function proxyAgentStream(body: unknown): Promise<Response> {
  const upstream = await fetch(`${AGENT_URL}/agent/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    throw new Error(`agent upstream error: ${upstream.status}`);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
