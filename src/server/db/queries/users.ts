import type { GoogleUser } from "../../auth/oauth";
import type { Db } from "../client";
import { type User, users } from "../schema";

/**
 * Crea o aggiorna l'utente a partire dal profilo Google (upsert atomico su google_sub).
 * Se l'email è in allowlist promuove/mantiene admin; altrimenti il ruolo esistente resta invariato.
 */
export async function upsertUserFromGoogle(
  db: Db,
  google: GoogleUser,
  isAdmin: boolean,
): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      googleSub: google.sub,
      email: google.email,
      name: google.name,
      avatarUrl: google.picture,
      role: isAdmin ? "admin" : "user",
    })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: {
        email: google.email,
        name: google.name,
        avatarUrl: google.picture,
        updatedAt: new Date(),
        // Promuove ad admin se in allowlist; altrimenti non tocca il ruolo esistente.
        ...(isAdmin ? { role: "admin" as const } : {}),
      },
    })
    .returning();
  return row;
}
