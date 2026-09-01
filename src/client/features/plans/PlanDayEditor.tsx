import type { PlanDayDto } from '@shared/schemas';
import { type FormEvent, useState } from 'react';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PlusIcon, TrashIcon } from '@/components/icons';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { useCreateExercise } from '@/features/exercises/useExercises';
import { PlanExerciseRow } from './PlanExerciseRow';
import type { usePlanMutations } from './usePlanDetail';

type Mutations = ReturnType<typeof usePlanMutations>;

export function PlanDayEditor({ day, mutations }: { day: PlanDayDto; mutations: Mutations }) {
  const [adding, setAdding] = useState(false);
  const [freeText, setFreeText] = useState('');
  const createExercise = useCreateExercise();

  function addFromCatalog(exerciseId: string) {
    mutations.addExercise.mutate(
      { dayId: day.id, input: { exerciseId } },
      { onSuccess: () => setAdding(false) },
    );
  }

  function addFreeText(e: FormEvent) {
    e.preventDefault();
    const name = freeText.trim();
    if (name === '') return;
    // Crea l'esercizio custom (testo libero) e lo aggiunge al giorno; chiude solo se l'aggiunta riesce.
    createExercise.mutate(
      { name, equipment: 'other' },
      {
        onSuccess: (ex) => {
          mutations.addExercise.mutate(
            { dayId: day.id, input: { exerciseId: ex.id } },
            {
              onSuccess: () => {
                setFreeText('');
                setAdding(false);
              },
            },
          );
        },
      },
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-text">{day.name}</h3>
        <IconButton
          label={`Elimina giorno ${day.name}`}
          onClick={() => mutations.deleteDay.mutate(day.id)}
        >
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </div>

      {day.exercises.length === 0 ? (
        <p className="text-xs text-text-muted">Nessun esercizio in questo giorno.</p>
      ) : (
        <div className="space-y-2">
          {day.exercises.map((ex) => (
            <PlanExerciseRow
              key={ex.id}
              exercise={ex}
              onUpdate={(input) =>
                mutations.updateExercise.mutateAsync({ dayId: day.id, peId: ex.id, input })
              }
              onDelete={() => mutations.deleteExercise.mutate({ dayId: day.id, peId: ex.id })}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
          <ExercisePicker
            listLabel="Esercizi da aggiungere"
            onSelect={(ex) => addFromCatalog(ex.id)}
          />
          <form onSubmit={addFreeText} className="flex gap-2 border-t border-border pt-3">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="…oppure un esercizio a testo libero"
              aria-label="Esercizio a testo libero"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              maxLength={120}
            />
            <button
              type="submit"
              disabled={createExercise.isPending || freeText.trim() === ''}
              className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Aggiungi
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-text-muted hover:text-text"
          >
            Chiudi
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          <PlusIcon className="h-4 w-4" /> Aggiungi esercizio
        </button>
      )}
    </Card>
  );
}
