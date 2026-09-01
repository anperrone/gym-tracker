import type { WorkoutSessionDetailDto } from '@shared/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { SessionExerciseCard } from './SessionExerciseCard';
import { useSessionMutations, useWorkoutSession } from './useWorkoutSession';

export function WorkoutSessionPage({ sessionId }: { sessionId: string }) {
  const { data: session, isPending, isError } = useWorkoutSession(sessionId);

  return (
    <div className="space-y-6">
      <Link to="/workout" className="inline-block text-sm text-text-muted hover:text-text">
        ← Allenamenti
      </Link>

      {isPending ? (
        <p className="text-sm text-text-muted">Caricamento…</p>
      ) : isError || !session ? (
        <p className="text-sm text-negative">Sessione non trovata.</p>
      ) : (
        <LoadedSession sessionId={sessionId} session={session} />
      )}
    </div>
  );
}

function SessionHeader({
  session,
  onComplete,
  completing,
}: {
  session: WorkoutSessionDetailDto;
  onComplete: () => void;
  completing: boolean;
}) {
  const completed = session.status === 'completed';
  return (
    <header className="flex items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold text-text">
          {new Date(session.performedAt).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h2>
        <span
          className={`text-xs font-medium uppercase ${completed ? 'text-positive' : 'text-accent'}`}
        >
          {completed ? 'Completato' : 'In corso'}
        </span>
      </div>
      {!completed && (
        <button
          type="button"
          onClick={onComplete}
          disabled={completing}
          className="shrink-0 rounded-xl bg-positive px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Completa
        </button>
      )}
    </header>
  );
}

function LoadedSession({
  sessionId,
  session,
}: {
  sessionId: string;
  session: WorkoutSessionDetailDto;
}) {
  const mutations = useSessionMutations(sessionId);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <SessionHeader
        session={session}
        onComplete={() => mutations.complete.mutate(undefined)}
        completing={mutations.complete.isPending}
      />

      {session.exercises.length === 0 ? (
        <p className="text-sm text-text-muted">Nessun esercizio. Aggiungine uno qui sotto.</p>
      ) : (
        <div className="space-y-4">
          {session.exercises.map((exercise) => (
            <SessionExerciseCard key={exercise.id} exercise={exercise} mutations={mutations} />
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-3 rounded-2xl border border-border p-3">
          <ExercisePicker
            listLabel="Esercizi da aggiungere"
            onSelect={(ex) =>
              mutations.addExercise.mutate(ex.id, { onSuccess: () => setAdding(false) })
            }
          />
          {mutations.addExercise.isError && (
            <p className="text-xs text-negative">Impossibile aggiungere l'esercizio. Riprova.</p>
          )}
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
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent"
        >
          + Aggiungi esercizio
        </button>
      )}

      {session.status === 'completed' && (
        <button
          type="button"
          onClick={() => navigate({ to: '/workout' })}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          Torna agli allenamenti
        </button>
      )}
    </>
  );
}
