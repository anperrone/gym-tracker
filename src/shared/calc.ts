/**
 * Calcoli derivati dagli allenamenti (logica pura, testabile e condivisa client/server).
 */

/** 1RM stimato con la formula di Epley: weight·(1 + reps/30). Con reps=1 → weight. */
export function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Volume di una serie: peso × ripetizioni. */
export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}

/** Arrotonda a `decimals` cifre decimali (default 1). */
export function roundTo(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
