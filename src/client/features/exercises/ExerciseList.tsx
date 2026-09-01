import type { Equipment, ExerciseDto, ExerciseFilters } from '@shared/schemas';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_OPTIONS,
  useDeleteExercise,
  useExercises,
} from './useExercises';

function groupByEquipment(rows: ExerciseDto[]): [Equipment, ExerciseDto[]][] {
  const map = new Map<Equipment, ExerciseDto[]>();
  for (const row of rows) {
    const arr = map.get(row.equipment) ?? [];
    arr.push(row);
    map.set(row.equipment, arr);
  }
  // Ordine coerente con EQUIPMENT_OPTIONS.
  return EQUIPMENT_OPTIONS.filter(([eq]) => map.has(eq)).map(([eq]) => [eq, map.get(eq) ?? []]);
}

export function ExerciseList({ filters }: { filters: ExerciseFilters }) {
  const { data: rows = [], isPending } = useExercises(filters);
  const del = useDeleteExercise();

  if (isPending) return <p className="text-sm text-text-muted">Caricamento…</p>;
  if (rows.length === 0)
    return <p className="text-sm text-text-muted">Nessun esercizio trovato.</p>;

  const groups = groupByEquipment(rows);

  return (
    <div className="space-y-5">
      {groups.map(([equipment, items]) => (
        <section key={equipment}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {EQUIPMENT_LABELS[equipment]} <span className="tabular-nums">({items.length})</span>
          </h3>
          <ul aria-label={EQUIPMENT_LABELS[equipment]} className="space-y-2">
            {items.map((ex) => (
              <li key={ex.id}>
                <Card className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">{ex.name}</span>
                      {ex.isCustom && (
                        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase text-text-muted">
                          Custom
                        </span>
                      )}
                    </div>
                    {ex.muscleGroup && (
                      <p className="mt-0.5 truncate text-xs text-text-muted">{ex.muscleGroup}</p>
                    )}
                  </div>
                  {ex.isCustom && (
                    <IconButton label={`Elimina ${ex.name}`} onClick={() => del.mutate(ex.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
