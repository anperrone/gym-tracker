import {
  type HealthResponse,
  healthResponseSchema,
  type MeResponse,
  meResponseSchema,
} from "@shared/schemas";
import type { ZodType } from "zod";

/** Errore di richiesta API con status HTTP. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** GET tipizzato: esegue la fetch e valida la risposta con lo schema Zod fornito. */
async function getJson<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status}`);
  }
  return schema.parse(await res.json());
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson("/api/health", healthResponseSchema);
}

/** Profilo utente corrente; `null` se non autenticato (401). */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status}`);
  }
  return meResponseSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  const res = await fetch("/auth/logout", { method: "POST" });
  if (!res.ok) {
    throw new ApiError(res.status, "Logout fallito");
  }
}
