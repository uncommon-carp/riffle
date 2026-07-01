import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chat } from "./routes/chat.js";

const app = new Hono();

// The frontend (Next.js dev server, a different origin/port) calls /api/*
// directly from the browser — see ARCHITECTURE.md "Why a BFF?".
app.use(
  "/api/*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    allowMethods: ["POST"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", chat);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`BFF listening on http://localhost:${port}`);
