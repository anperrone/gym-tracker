import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import { usePlanDetail } from '@/features/plans/usePlanDetail';
import { usePlans } from '@/features/plans/usePlans';
import { useDeleteSession, useSessions, useStartSession } from '@/features/workouts/useWorkouts';

function StartFromPlan({ onStart }: { onStart: (planDayId: string) => void }) {
  const { data: plans = [] } = usePlans();
  const [planId, setPlanId] = useState('');
  const [dayId, setDayId] = useState('');
  const { data: detail } = usePlanDetail(planId);

  if (plans.length === 0) return null;
  const select = 'rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text';

  return (
    <Card className="p-3">
      <p className="mb-2 text-xs font-medium uppercase text-text-muted">Da una scheda</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={planId}
          onChange={(e) => {
            setPlanId(e.target.value);
            setDayId('');
          }}
          aria-label="Scheda"
          className={select}
        >
          <option value="">Scegli scheda…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {detail && detail.days.length > 0 && (
          <select
            value={dayId}
            onChange={(e) => setDayId(e.target.value)}
            aria-label="Giorno"
            className={select}
          >
            <option value="">Scegli giorno…</option>
            {detail.days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={dayId === ''}
          onClick={() => onStart(dayId)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Avvia
        </button>
      </div>
    </Card>
  );
}

export function WorkoutPage() {
  const { data: sessions = [], isPending } = useSessions();
  const start = useStartSession();
  const del = useDeleteSession();
  const navigate = useNavigate();

  function begin(planDayId?: string) {
    start.mutate(
      { clientId: crypto.randomUUID(), ...(planDayId ? { planDayId } : {}) },
      {
        onSuccess: (detail) =>
          navigate({ to: '/workout/$sessionId', params: { sessionId: detail.id } }),
      },
    );
  }

  const active = sessions.filter((s) => s.status === 'in_progress');
  const done = sessions.filter((s) => s.status === 'completed');

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Allenati</h2>
        <button
          type="button"
          onClick={() => begin()}
          disabled={start.isPending}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Avvia allenamento libero
        </button>
        <StartFromPlan onStart={(dayId) => begin(dayId)} />
      </section>

      {active.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
            In corso
          </h3>
          <ul aria-label="Sessioni in corso" className="space-y-2">
            {active.map((s) => (
              <li key={s.id}>
                <SessionRow
                  session={s}
                  onOpen={() =>
                    navigate({ to: '/workout/$sessionId', params: { sessionId: s.id } })
                  }
                  onDelete={() => del.mutate(s.id)}
                  cta="Riprendi"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Storico
        </h3>
        {isPending ? (
          <p className="text-sm text-text-muted">Caricamento…</p>
        ) : done.length === 0 ? (
          <p className="text-sm text-text-muted">Nessun allenamento completato.</p>
        ) : (
          <ul aria-label="Sessioni completate" className="space-y-2">
            {done.map((s) => (
              <li key={s.id}>
                <SessionRow
                  session={s}
                  onOpen={() =>
                    navigate({ to: '/workout/$sessionId', params: { sessionId: s.id } })
                  }
                  onDelete={() => del.mutate(s.id)}
                  cta="Apri"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionRow({
  session,
  onOpen,
  onDelete,
  cta,
}: {
  session: { id: string; performedAt: string; exerciseCount: number; setCount: number };
  onOpen: () => void;
  onDelete: () => void;
  cta: string;
}) {
  return (
    <Card className="flex items-center justify-between gap-2 p-3">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-text">
          {new Date(session.performedAt).toLocaleDateString('it-IT')}
        </p>
        <p className="text-xs text-text-muted tabular-nums">
          {`${session.exerciseCount} esercizi · ${session.setCount} serie`}
        </p>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium text-accent hover:underline"
      >
        {cta}
      </button>
      <IconButton label="Elimina sessione" onClick={onDelete}>
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </Card>
  );
}
