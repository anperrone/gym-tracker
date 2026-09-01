import { lazy, type ReactNode, Suspense, useState } from 'react';
import { MeasurementForm } from '@/features/measurements/MeasurementForm';
import { MeasurementHistory } from '@/features/measurements/MeasurementHistory';
import { StatOverview } from '@/features/measurements/StatOverview';
import { useMeasurementTypes } from '@/features/measurements/useMeasurements';

// Lazy-load del grafico: Recharts finisce in un chunk separato (bundle iniziale più leggero).
const MeasurementChart = lazy(() =>
  import('@/features/measurements/MeasurementChart').then((m) => ({
    default: m.MeasurementChart,
  })),
);

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-base font-semibold text-text">{children}</h2>;
}

export function MeasurementsPage() {
  const { data: types = [] } = useMeasurementTypes();
  const [selected, setSelected] = useState('mt_weight');
  const selectedType = types.find((t) => t.id === selected);

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Sintesi</SectionTitle>
        <StatOverview />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle>Andamento</SectionTitle>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text"
            aria-label="Metrica del grafico"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-surface-2" />}>
          <MeasurementChart typeId={selected} unit={selectedType?.unit ?? ''} />
        </Suspense>
      </section>

      <section>
        <SectionTitle>Nuova misurazione</SectionTitle>
        <MeasurementForm />
      </section>

      <section>
        <SectionTitle>Storico</SectionTitle>
        <MeasurementHistory />
      </section>
    </div>
  );
}
