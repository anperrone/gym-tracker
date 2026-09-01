import { Hono } from "hono";
import { auth } from "./routes/auth";
import { me } from "./routes/me";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// API
app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/me", me);

// OAuth (fuori da /api: redirect di navigazione)
app.route("/auth", auth);

// API sconosciute → 404 JSON (non deve ricadere sulla SPA).
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

// Tutto il resto → static assets / SPA fallback (index.html).
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
