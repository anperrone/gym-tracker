import { Link } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import {
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useSetPlanActive,
} from '@/features/plans/usePlans';

const inputClass =
  'min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text';

function CreatePlanForm() {
  const create = useCreatePlan();
  const [name, setName] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') return;
    create.mutate({ name: trimmed }, { onSuccess: () => setName('') });
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome scheda (es. Push/Pull/Legs)"
        aria-label="Nome scheda"
        className={inputClass}
        maxLength={120}
      />
      <button
        type="submit"
        disabled={create.isPending || name.trim() === ''}
        className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Crea
      </button>
    </form>
  );
}

export function PlansPage() {
  const { data: plans = [], isPending } = usePlans();
  const del = useDeletePlan();
  const setActive = useSetPlanActive();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-base font-semibold text-text">Le tue schede</h2>
        <CreatePlanForm />
      </section>

      <section>
        {isPending ? (
          <p className="text-sm text-text-muted">Caricamento…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-text-muted">Nessuna scheda ancora. Creane una qui sopra.</p>
        ) : (
          <ul aria-label="Schede" className="space-y-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Card className="flex items-center justify-between gap-2 p-3">
                  <Link to="/plans/$planId" params={{ planId: plan.id }} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">{plan.name}</span>
                      {plan.isActive && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                          Attiva
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted tabular-nums">
                      {plan.dayCount} {plan.dayCount === 1 ? 'giorno' : 'giorni'}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActive.mutate({ id: plan.id, isActive: !plan.isActive })}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted hover:text-text"
                    >
                      {plan.isActive ? 'Disattiva' : 'Attiva'}
                    </button>
                    <IconButton label={`Elimina ${plan.name}`} onClick={() => del.mutate(plan.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
