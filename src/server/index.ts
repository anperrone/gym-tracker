import { Hono } from "hono";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.get("/api/health", (c) => c.json({ ok: true }));

// API sconosciute → 404 JSON (non deve ricadere sulla SPA).
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

// Tutto il resto → static assets / SPA fallback (index.html).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
