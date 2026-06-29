import { Hono } from "hono";
import { requireAuth } from "../auth.js";
import { proxyAgentStream } from "../proxy.js";

export const chat = new Hono();

interface ChatRequest {
  input: string;
  model: string;
}

chat.post("/api/chat", requireAuth, async (c) => {
  const { input, model } = await c.req.json<ChatRequest>();

  // Inject the client-selected model into the upstream request.
  return proxyAgentStream({ input, model });
});
