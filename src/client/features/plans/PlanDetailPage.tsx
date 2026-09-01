import { Link } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { PlanDayEditor } from './PlanDayEditor';
import { usePlanDetail, usePlanMutations } from './usePlanDetail';

export function PlanDetailPage({ planId }: { planId: string }) {
  const { data: plan, isPending, isError } = usePlanDetail(planId);
  const mutations = usePlanMutations(planId);
  const [dayName, setDayName] = useState('');

  function addDay(e: FormEvent) {
    e.preventDefault();
    const name = dayName.trim();
    if (name === '') return;
    mutations.addDay.mutate(name, { onSuccess: () => setDayName('') });
  }

  return (
    <div className="space-y-6">
      <Link to="/plans" className="inline-block text-sm text-text-muted hover:text-text">
        ← Schede
      </Link>

      {isPending ? (
        <p className="text-sm text-text-muted">Caricamento…</p>
      ) : isError || !plan ? (
        <p className="text-sm text-negative">Scheda non trovata.</p>
      ) : (
        <>
          <header>
            <h2 className="text-lg font-bold text-text">{plan.name}</h2>
            {plan.description && <p className="text-sm text-text-muted">{plan.description}</p>}
          </header>

          <form onSubmit={addDay} className="flex gap-2">
            <input
              type="text"
              value={dayName}
              onChange={(e) => setDayName(e.target.value)}
              placeholder="Nuovo giorno (es. Giorno A / Push)"
              aria-label="Nome del giorno"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              maxLength={120}
            />
            <button
              type="submit"
              disabled={mutations.addDay.isPending || dayName.trim() === ''}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Aggiungi giorno
            </button>
          </form>

          {plan.days.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nessun giorno ancora. Aggiungi il primo qui sopra.
            </p>
          ) : (
            <div className="space-y-4">
              {plan.days.map((day) => (
                <PlanDayEditor key={day.id} day={day} mutations={mutations} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
