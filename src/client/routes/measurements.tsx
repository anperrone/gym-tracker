import { lazy, Suspense, useState } from 'react';
import { MeasurementForm } from '@/features/measurements/MeasurementForm';
import { MeasurementHistory } from '@/features/measurements/MeasurementHistory';
import { useMeasurementTypes } from '@/features/measurements/useMeasurements';

// Lazy-load del grafico: Recharts finisce in un chunk separato (bundle iniziale più leggero).
const MeasurementChart = lazy(() =>
  import('@/features/measurements/MeasurementChart').then((m) => ({
    default: m.MeasurementChart,
  })),
);

export function MeasurementsPage() {
  const { data: types = [] } = useMeasurementTypes();
  const [selected, setSelected] = useState('mt_weight');
  const selectedType = types.find((t) => t.id === selected);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-base font-semibold text-slate-700">Nuova misurazione</h2>
        <MeasurementForm />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">Andamento</h2>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            aria-label="Metrica del grafico"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-slate-100" />}>
          <MeasurementChart typeId={selected} unit={selectedType?.unit ?? ''} />
        </Suspense>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-slate-700">Storico</h2>
        <MeasurementHistory />
      </section>
    </div>
  );
}
