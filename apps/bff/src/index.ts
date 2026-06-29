import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { chat } from "./routes/chat.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));
app.route("/", chat);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`BFF listening on http://localhost:${port}`);
