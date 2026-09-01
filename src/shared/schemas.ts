import { z } from "zod";

/**
 * Schemi Zod condivisi tra client e server.
 * Il confine API valida sempre con questi schemi; i tipi si derivano con z.infer.
 * Le milestone successive aggiungono qui gli schemi di dominio (misure, esercizi, ...).
 */

export const healthResponseSchema = z.object({
  ok: z.boolean(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
