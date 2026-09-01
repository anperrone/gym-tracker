import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../src/server/auth/crypto";
import { createSession, invalidateSession, validateSession } from "../../src/server/auth/session";
import { createDb, type Db } from "../../src/server/db/client";
import { sessions, users } from "../../src/server/db/schema";

async function seedUser(db: Db): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, googleSub: `sub-${id}`, email: `${id}@example.com` });
  return id;
}

describe("modulo sessioni", () => {
  it("crea e valida una sessione", async () => {
    const db = createDb(env.DB);
    const userId = await seedUser(db);
    const token = await createSession(db, userId);

    const result = await validateSession(db, token);
    expect(result?.user.id).toBe(userId);
    expect(result?.renewed).toBe(false);
  });

  it("revoca la sessione", async () => {
    const db = createDb(env.DB);
    const userId = await seedUser(db);
    const token = await createSession(db, userId);

    await invalidateSession(db, token);
    expect(await validateSession(db, token)).toBeNull();
  });

  it("scarta e rimuove una sessione scaduta", async () => {
    const db = createDb(env.DB);
    const userId = await seedUser(db);
    const token = "expired-token";
    const id = await sha256Hex(token);
    await db.insert(sessions).values({ id, userId, expiresAt: new Date(Date.now() - 1000) });

    expect(await validateSession(db, token)).toBeNull();
    const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
    expect(row).toBeUndefined();
  });

  it("token inesistente → null", async () => {
    const db = createDb(env.DB);
    expect(await validateSession(db, "non-esiste")).toBeNull();
  });
});
