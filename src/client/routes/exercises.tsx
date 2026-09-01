import type { Equipment, ExerciseFilters } from '@shared/schemas';
import { type ReactNode, useState } from 'react';
import { ExerciseForm } from '@/features/exercises/ExerciseForm';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { EQUIPMENT_OPTIONS } from '@/features/exercises/useExercises';

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-base font-semibold text-text">{children}</h2>;
}

export function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<Equipment | ''>('');

  const filters: ExerciseFilters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(equipment ? { equipment } : {}),
  };

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Catalogo esercizi</SectionTitle>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca esercizio…"
            aria-label="Cerca esercizio"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | '')}
            aria-label="Filtra per attrezzatura"
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
          >
            <option value="">Tutte</option>
            {EQUIPMENT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <ExerciseList filters={filters} />
      </section>

      <section>
        <SectionTitle>Aggiungi esercizio</SectionTitle>
        <ExerciseForm />
      </section>
    </div>
  );
}
