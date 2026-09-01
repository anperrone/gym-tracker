import type { PlanExerciseDto, UpdatePlanExerciseInput } from '@shared/schemas';
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import { EQUIPMENT_LABELS } from '@/features/exercises/useExercises';

const field =
  'w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-text tabular-nums';
const fieldLabel = 'block text-[10px] font-medium uppercase text-text-muted';

/** Parsa un intero da input; '' → null (azzera), non numerico → undefined (invariato). */
function parseIntOrNull(value: string): number | null | undefined {
  const t = value.trim();
  if (t === '') return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatOrNull(value: string): number | null | undefined {
  const t = value.trim();
  if (t === '') return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

type Props = {
  exercise: PlanExerciseDto;
  onUpdate: (input: UpdatePlanExerciseInput) => void;
  onDelete: () => void;
};

/** Riga di un esercizio pianificato: nome + target modificabili inline (persistiti su blur). */
export function PlanExerciseRow({ exercise, onUpdate, onDelete }: Props) {
  const [sets, setSets] = useState(exercise.targetSets?.toString() ?? '');
  const [reps, setReps] = useState(exercise.targetReps ?? '');
  const [weight, setWeight] = useState(exercise.targetWeight?.toString() ?? '');
  const [notes, setNotes] = useState(exercise.notes ?? '');

  function persist() {
    onUpdate({
      targetSets: parseIntOrNull(sets),
      targetReps: reps.trim() === '' ? null : reps.trim(),
      targetWeight: parseFloatOrNull(weight),
      notes: notes.trim() === '' ? null : notes.trim(),
    });
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
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={persist}
            className={field}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Reps</span>
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={persist}
            placeholder="8-12"
            className={field}
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
            onBlur={persist}
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
          onBlur={persist}
          placeholder="Opzionale"
          className={field}
          maxLength={500}
        />
      </label>
    </div>
  );
}
