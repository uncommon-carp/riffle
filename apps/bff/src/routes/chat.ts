import { Hono } from "hono";
import { requireAuth } from "../auth.js";
import { proxyAgentStream } from "../proxy.js";

export const chat = new Hono();

interface ChatRequest {
  input: string;
  model: string;
  /** Stable per-browser-session id; becomes the agent's conversation thread. */
  sessionId?: string;
}

chat.post("/api/chat", requireAuth, async (c) => {
  const { input, model, sessionId } = await c.req.json<ChatRequest>();

  // Inject the client-selected model and thread the session id through as the
  // agent's `thread_id` so scan findings persist across follow-up questions.
  return proxyAgentStream({ input, model, thread_id: sessionId });
});
