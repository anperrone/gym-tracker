import type { ExerciseDto } from '@shared/schemas';
import { useState } from 'react';
import { EQUIPMENT_LABELS, useExercises } from './useExercises';

type ExercisePickerProps = {
  onSelect: (exercise: ExerciseDto) => void;
  /** Filtro aggiuntivo lato client (es. escludi sé stesso o mostra solo il catalogo globale). */
  filter?: (exercise: ExerciseDto) => boolean;
  /** Etichetta accessibile della lista dei risultati. */
  listLabel?: string;
};

/** Selettore riusabile di esercizi dal catalogo (ricerca + selezione). */
export function ExercisePicker({
  onSelect,
  filter,
  listLabel = 'Risultati esercizi',
}: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const { data: rows = [], isPending } = useExercises(
    search.trim() ? { search: search.trim() } : {},
  );
  const items = filter ? rows.filter(filter) : rows;

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca esercizio…"
        aria-label="Cerca esercizio"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
      />
      {isPending ? (
        <p className="text-sm text-text-muted">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted">Nessun esercizio trovato.</p>
      ) : (
        <ul aria-label={listLabel} className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onSelect(ex)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-text transition-colors hover:border-accent"
              >
                <span className="min-w-0 truncate">
                  {ex.name}
                  {ex.muscleGroup && (
                    <span className="ml-1 text-xs text-text-muted">· {ex.muscleGroup}</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] uppercase text-text-muted">
                  {EQUIPMENT_LABELS[ex.equipment]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
