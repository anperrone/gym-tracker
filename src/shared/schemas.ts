import { z } from 'zod';

/**
 * Schemi Zod condivisi tra client e server.
 * Il confine API valida sempre con questi schemi; i tipi si derivano con z.infer.
 * Le milestone successive aggiungono qui gli schemi di dominio (misure, esercizi, ...).
 */

export const healthResponseSchema = z.object({
  ok: z.boolean(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Profilo dell'utente autenticato (risposta di GET /api/me). */
export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;
