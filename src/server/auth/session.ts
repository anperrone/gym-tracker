import { eq } from 'drizzle-orm';
import { SESSION_TTL_SECONDS } from '../config';
import type { Db } from '../db/client';
import { type Session, sessions, type User, users } from '../db/schema';
import { randomToken, sha256Hex } from './crypto';

const TTL_MS = SESSION_TTL_SECONDS * 1000;

export interface SessionValidation {
  user: User;
  session: Session;
  /** true se la sessione è stata rinnovata (il cookie va riscritto). */
  renewed: boolean;
}

/** Crea una sessione e restituisce il token in chiaro (da mettere nel cookie). */
export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return token;
}

/** Valida un token di sessione; rinnova in modo scorrevole oltre metà TTL. */
export async function validateSession(db: Db, token: string): Promise<SessionValidation | null> {
  const id = await sha256Hex(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));

  if (!row) return null;

  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  let session = row.session;
  let renewed = false;
  const remaining = session.expiresAt.getTime() - now;
  if (remaining < TTL_MS / 2) {
    const expiresAt = new Date(now + TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    session = { ...session, expiresAt };
    renewed = true;
  }

  return { user: row.user, session, renewed };
}

/** Revoca (elimina) la sessione associata al token. */
export async function invalidateSession(db: Db, token: string): Promise<void> {
  const id = await sha256Hex(token);
  await db.delete(sessions).where(eq(sessions.id, id));
}
