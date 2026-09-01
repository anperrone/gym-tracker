import type { SessionExerciseDto } from '@shared/schemas';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PlusIcon, TrashIcon } from '@/components/icons';
import { EQUIPMENT_LABELS } from '@/features/exercises/useExercises';
import { SetRow } from './SetRow';
import type { useSessionMutations } from './useWorkoutSession';

type Mutations = ReturnType<typeof useSessionMutations>;

export function SessionExerciseCard({
  exercise,
  mutations,
}: {
  exercise: SessionExerciseDto;
  mutations: Mutations;
}) {
  // Quick-repeat: la nuova serie eredita peso/reps dell'ultima.
  function addSet() {
    const last = exercise.sets.at(-1);
    mutations.addSet.mutate({
      seId: exercise.id,
      input: { weight: last?.weight ?? null, reps: last?.reps ?? null },
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text">{exercise.exerciseName}</h3>
          <p className="text-[10px] uppercase text-text-muted">
            {EQUIPMENT_LABELS[exercise.equipment]}
          </p>
        </div>
        <IconButton
          label={`Rimuovi ${exercise.exerciseName}`}
          onClick={() => mutations.deleteExercise.mutate(exercise.id)}
        >
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </div>

      {exercise.sets.length > 0 && (
        <div className="mb-3 space-y-2">
          {exercise.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              onUpdate={(input) =>
                mutations.updateSet.mutateAsync({ seId: exercise.id, setId: set.id, input })
              }
              onDelete={() => mutations.deleteSet.mutate({ seId: exercise.id, setId: set.id })}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addSet}
        disabled={mutations.addSet.isPending}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" /> Aggiungi serie
      </button>
    </Card>
  );
}
