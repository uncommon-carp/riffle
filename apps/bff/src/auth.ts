import type { Context, Next } from "hono";

/**
 * Dev-only JWT stub. v1 is out of scope for real auth (see ARCHITECTURE.md);
 * this accepts a single static bearer token so the egress boundary exists and
 * can be swapped for real JWT validation later.
 */
const DEV_TOKEN = process.env.DEV_JWT ?? "dev-token";

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== DEV_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
}
