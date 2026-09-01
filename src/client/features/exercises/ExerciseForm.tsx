import type { Equipment } from '@shared/schemas';
import { type FormEvent, useState } from 'react';
import { EQUIPMENT_OPTIONS, useCreateExercise } from './useExercises';

const inputClass =
  'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text';
const labelClass = 'block text-xs font-medium text-text-muted';

/** Form per aggiungere un esercizio custom a testo libero. */
export function ExerciseForm() {
  const create = useCreateExercise();
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('other');
  const [muscleGroup, setMuscleGroup] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') return;
    create.mutate(
      {
        name: trimmed,
        equipment,
        muscleGroup: muscleGroup.trim() || null,
      },
      {
        onSuccess: () => {
          setName('');
          setMuscleGroup('');
          setEquipment('other');
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3">
        <label className={labelClass} htmlFor="exercise-name">
          Nome esercizio
        </label>
        <input
          id="exercise-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Pulley basso presa stretta"
          className={inputClass}
          maxLength={120}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="exercise-equipment">
            Attrezzatura
          </label>
          <select
            id="exercise-equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
            className={inputClass}
          >
            {EQUIPMENT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="exercise-muscle">
            Gruppo muscolare <span className="text-text-muted">(opzionale)</span>
          </label>
          <input
            id="exercise-muscle"
            type="text"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            placeholder="Es. Dorsali"
            className={inputClass}
            maxLength={120}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={create.isPending || name.trim() === ''}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {create.isPending ? 'Salvataggio…' : 'Aggiungi esercizio'}
      </button>
      {create.isError && (
        <p className="mt-2 text-xs text-negative">Errore nella creazione dell'esercizio.</p>
      )}
    </form>
  );
}
