import { eq } from "drizzle-orm";
import type { GoogleUser } from "../../auth/oauth";
import type { Db } from "../client";
import { type User, users } from "../schema";

/**
 * Crea o aggiorna l'utente a partire dal profilo Google.
 * Se l'email è in allowlist, assegna/mantiene il ruolo admin.
 */
export async function upsertUserFromGoogle(
  db: Db,
  google: GoogleUser,
  isAdmin: boolean,
): Promise<User> {
  const [existing] = await db.select().from(users).where(eq(users.googleSub, google.sub));

  if (existing) {
    const role = isAdmin ? "admin" : existing.role;
    const [updated] = await db
      .update(users)
      .set({
        email: google.email,
        name: google.name,
        avatarUrl: google.picture,
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      googleSub: google.sub,
      email: google.email,
      name: google.name,
      avatarUrl: google.picture,
      role: isAdmin ? "admin" : "user",
    })
    .returning();
  return created;
}
