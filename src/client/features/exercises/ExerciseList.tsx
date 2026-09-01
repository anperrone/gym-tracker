import type { Equipment, ExerciseDto, ExerciseFilters } from '@shared/schemas';
import { useCallback, useState } from 'react';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { LinkIcon, TrashIcon } from '@/components/icons';
import { LinkCanonicalDialog } from './LinkCanonicalDialog';
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
  // Ordine coerente con EQUIPMENT_OPTIONS, solo i gruppi presenti.
  return EQUIPMENT_OPTIONS.flatMap(([eq]) => {
    const items = map.get(eq);
    return items ? [[eq, items] as [Equipment, ExerciseDto[]]] : [];
  });
}

export function ExerciseList({ filters }: { filters: ExerciseFilters }) {
  const { data: rows = [], isPending } = useExercises(filters);
  // Elenco completo (non filtrato) per risolvere il nome della canonica anche sotto filtro.
  const { data: allRows = [] } = useExercises({});
  const del = useDeleteExercise();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const closeLink = useCallback(() => setLinkingId(null), []);

  if (isPending) return <p className="text-sm text-text-muted">Caricamento…</p>;
  if (rows.length === 0)
    return <p className="text-sm text-text-muted">Nessun esercizio trovato.</p>;

  const groups = groupByEquipment(rows);
  const nameById = new Map(allRows.map((r) => [r.id, r.name]));
  const linking = rows.find((r) => r.id === linkingId) ?? null;

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
                    {ex.isCustom && ex.canonicalExerciseId && (
                      <p className="mt-0.5 truncate text-xs text-accent">
                        → {nameById.get(ex.canonicalExerciseId) ?? 'voce canonica'}
                      </p>
                    )}
                  </div>
                  {ex.isCustom && (
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton label={`Collega ${ex.name}`} onClick={() => setLinkingId(ex.id)}>
                        <LinkIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={`Elimina ${ex.name}`} onClick={() => del.mutate(ex.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {linking && (
        <LinkCanonicalDialog
          exercise={linking}
          canonicalName={
            linking.canonicalExerciseId ? (nameById.get(linking.canonicalExerciseId) ?? null) : null
          }
          onClose={closeLink}
        />
      )}
    </div>
  );
}
