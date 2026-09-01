import type { WorkoutSessionDetailDto } from '@shared/schemas';
import { describe, expect, it } from 'vitest';
import { applyAddSet, applyDeleteSet, applyUpdateSet } from './optimistic';

const base: WorkoutSessionDetailDto = {
  id: 's1',
  planDayId: null,
  status: 'in_progress',
  performedAt: '2026-02-01T10:00:00.000Z',
  durationSeconds: null,
  notes: null,
  exercises: [
    {
      id: 'se1',
      exerciseId: 'ex_squat',
      exerciseName: 'Squat',
      equipment: 'barbell',
      sortOrder: 0,
      sets: [{ id: 'set1', setNumber: 1, weight: 60, reps: 12, notes: null, completed: false }],
    },
  ],
};

describe('optimistic set helpers', () => {
  it('applyAddSet accoda una serie con setNumber incrementale (senza mutare l’originale)', () => {
    const next = applyAddSet(base, 'se1', { weight: 70, reps: 10 });
    expect(next.exercises[0].sets).toHaveLength(2);
    expect(next.exercises[0].sets[1].setNumber).toBe(2);
    expect(next.exercises[0].sets[1].weight).toBe(70);
    // immutabilità
    expect(base.exercises[0].sets).toHaveLength(1);
  });

  it('applyUpdateSet cambia solo i campi forniti', () => {
    const next = applyUpdateSet(base, 'se1', 'set1', { weight: 65 });
    expect(next.exercises[0].sets[0].weight).toBe(65);
    expect(next.exercises[0].sets[0].reps).toBe(12);
    expect(base.exercises[0].sets[0].weight).toBe(60);
  });

  it('applyDeleteSet rimuove la serie', () => {
    const next = applyDeleteSet(base, 'se1', 'set1');
    expect(next.exercises[0].sets).toHaveLength(0);
    expect(base.exercises[0].sets).toHaveLength(1);
  });

  it('ignora un esercizio inesistente', () => {
    const next = applyAddSet(base, 'nope', { weight: 1 });
    expect(next.exercises[0].sets).toHaveLength(1);
  });
});
