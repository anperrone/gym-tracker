import type { PlanExerciseDto, UpdatePlanExerciseInput } from '@shared/schemas';
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import { EQUIPMENT_LABELS } from '@/features/exercises/useExercises';

const field =
  'w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-text tabular-nums';
const fieldLabel = 'block text-[10px] font-medium uppercase text-text-muted';

/** Parsa un numero da input; '' → null (azzera), non finito → undefined (input non valido). */
function parseNumber(value: string, integer: boolean): number | null | undefined {
  const t = value.trim();
  if (t === '') return null;
  const n = integer ? Number.parseInt(t, 10) : Number.parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

type Props = {
  exercise: PlanExerciseDto;
  onUpdate: (input: UpdatePlanExerciseInput) => Promise<unknown>;
  onDelete: () => void;
};

/**
 * Riga di un esercizio pianificato: nome + target modificabili inline.
 * Ogni campo si persiste su blur, ma solo se è cambiato e valido (una sola PATCH per campo,
 * niente sovrascritture incrociate). Gli errori del server (valore fuori range) sono mostrati.
 */
export function PlanExerciseRow({ exercise, onUpdate, onDelete }: Props) {
  const [sets, setSets] = useState(exercise.targetSets?.toString() ?? '');
  const [reps, setReps] = useState(exercise.targetReps ?? '');
  const [weight, setWeight] = useState(exercise.targetWeight?.toString() ?? '');
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [error, setError] = useState(false);

  /** Persiste un singolo campo se differisce dal valore corrente. `undefined` = input non valido. */
  function commit(patch: UpdatePlanExerciseInput, current: unknown, next: unknown) {
    if (next === undefined || next === current) return;
    onUpdate(patch).then(
      () => setError(false),
      () => setError(true),
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{exercise.exerciseName}</p>
          <p className="text-[10px] uppercase text-text-muted">
            {EQUIPMENT_LABELS[exercise.equipment]}
          </p>
        </div>
        <IconButton label={`Rimuovi ${exercise.exerciseName}`} onClick={onDelete}>
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className={fieldLabel}>Serie</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={() => {
              const next = parseNumber(sets, true);
              commit({ targetSets: next }, exercise.targetSets, next);
            }}
            className={field}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Reps</span>
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={() => {
              const next = reps.trim() === '' ? null : reps.trim();
              commit({ targetReps: next }, exercise.targetReps, next);
            }}
            placeholder="8-12"
            className={field}
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Peso kg</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => {
              const next = parseNumber(weight, false);
              commit({ targetWeight: next }, exercise.targetWeight, next);
            }}
            className={field}
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className={fieldLabel}>Note</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const next = notes.trim() === '' ? null : notes.trim();
            commit({ notes: next }, exercise.notes, next);
          }}
          placeholder="Opzionale"
          className={field}
          maxLength={500}
        />
      </label>

      {error && (
        <p className="mt-2 text-xs text-negative">Valore non salvato: controlla il campo.</p>
      )}
    </div>
  );
}
