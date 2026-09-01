import { lazy, type ReactNode, Suspense, useState } from 'react';
import type { ProgressMetric } from '@/features/progress/ProgressChart';
import { useExerciseProgress, useProgressExercises } from '@/features/progress/useProgress';

const ProgressChart = lazy(() =>
  import('@/features/progress/ProgressChart').then((m) => ({ default: m.ProgressChart })),
);
const MeasurementChart = lazy(() =>
  import('@/features/measurements/MeasurementChart').then((m) => ({ default: m.MeasurementChart })),
);

const METRICS: { key: ProgressMetric; label: string; unit: string }[] = [
  { key: 'topWeight', label: 'Peso max', unit: 'kg' },
  { key: 'best1RM', label: '1RM stimato', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: '' },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-base font-semibold text-text">{children}</h2>;
}

const chartFallback = <div className="h-56 animate-pulse rounded-xl bg-surface-2" />;

export function ProgressPage() {
  const { data: exercises = [], isPending } = useProgressExercises();
  const [selectedId, setSelectedId] = useState('');
  const [metric, setMetric] = useState<ProgressMetric>('topWeight');

  const selected = selectedId || exercises[0]?.exerciseId || '';
  const { data: points = [] } = useExerciseProgress(selected);
  const unit = METRICS.find((m) => m.key === metric)?.unit ?? '';

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Progressione per esercizio</SectionTitle>
        {isPending ? (
          <p className="text-sm text-text-muted">Caricamento…</p>
        ) : exercises.length === 0 ? (
          <p className="text-sm text-text-muted">
            Registra un allenamento con carichi e ripetizioni per vedere i progressi.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                value={selected}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Esercizio"
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
              >
                {exercises.map((ex) => (
                  <option key={ex.exerciseId} value={ex.exerciseId}>
                    {ex.exerciseName}
                  </option>
                ))}
              </select>
              <fieldset className="m-0 flex gap-1 border-0 p-0" aria-label="Metrica">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    aria-pressed={metric === m.key}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                      metric === m.key
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-text-muted hover:text-text'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </fieldset>
            </div>
            <Suspense fallback={chartFallback}>
              <ProgressChart points={points} metric={metric} unit={unit} />
            </Suspense>
          </>
        )}
      </section>

      <section>
        <SectionTitle>Peso corporeo</SectionTitle>
        <Suspense fallback={chartFallback}>
          <MeasurementChart typeId="mt_weight" unit="kg" />
        </Suspense>
      </section>
    </div>
  );
}
