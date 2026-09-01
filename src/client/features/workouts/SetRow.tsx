import type { SessionSetDto, UpdateSetInput } from '@shared/schemas';
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';

const numInput =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text tabular-nums';

function parseNumber(value: string, integer: boolean): number | null | undefined {
  const t = value.trim();
  if (t === '') return null;
  const n = integer ? Number.parseInt(t, 10) : Number.parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

type Props = {
  set: SessionSetDto;
  onUpdate: (input: UpdateSetInput) => Promise<unknown>;
  onDelete: () => void;
};

/** Una serie: peso, reps e stato "fatta" indipendenti. Ogni campo persiste su blur se cambiato. */
export function SetRow({ set, onUpdate, onDelete }: Props) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [error, setError] = useState(false);

  function commit(input: UpdateSetInput, current: unknown, next: unknown) {
    if (next === undefined || next === current) return;
    onUpdate(input).then(
      () => setError(false),
      () => setError(true),
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center text-xs font-semibold text-text-muted tabular-nums">
          {set.setNumber}
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min={0}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => {
            const next = parseNumber(weight, false);
            commit({ weight: next }, set.weight, next);
          }}
          aria-label={`Peso serie ${set.setNumber}`}
          placeholder="kg"
          className={numInput}
        />
        <span className="shrink-0 text-xs text-text-muted">×</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => {
            const next = parseNumber(reps, true);
            commit({ reps: next }, set.reps, next);
          }}
          aria-label={`Reps serie ${set.setNumber}`}
          placeholder="reps"
          className={numInput}
        />
        <button
          type="button"
          onClick={() => onUpdate({ completed: !set.completed }).catch(() => setError(true))}
          aria-label={set.completed ? 'Segna come non completata' : 'Segna come completata'}
          aria-pressed={set.completed}
          className={`shrink-0 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
            set.completed
              ? 'border-positive bg-positive/15 text-positive'
              : 'border-border text-text-muted hover:text-text'
          }`}
        >
          ✓
        </button>
        <IconButton label={`Elimina serie ${set.setNumber}`} onClick={onDelete}>
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </div>
      {error && (
        <p className="mt-1 pl-8 text-xs text-negative">Serie non salvata: controlla i valori.</p>
      )}
    </div>
  );
}
