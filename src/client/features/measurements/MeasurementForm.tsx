import { type FormEvent, useState } from 'react';
import { useCreateMeasurement, useMeasurementTypes } from './useMeasurements';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputClass =
  'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text tabular-nums';
const labelClass = 'block text-xs font-medium text-text-muted';

export function MeasurementForm() {
  const { data: types = [] } = useMeasurementTypes();
  const create = useCreateMeasurement();
  const [date, setDate] = useState(todayIso());
  const [values, setValues] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const entries = Object.entries(values)
      .filter(([, v]) => v.trim() !== '')
      .map(([typeId, v]) => ({ typeId, value: Number(v) }))
      .filter((entry) => Number.isFinite(entry.value));
    if (entries.length === 0) return;
    create.mutate({ measuredAt: date, values: entries }, { onSuccess: () => setValues({}) });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3">
        <label className={labelClass} htmlFor="measured-at">
          Data
        </label>
        <input
          id="measured-at"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => (
          <div key={t.id}>
            <label className={labelClass} htmlFor={`m-${t.id}`}>
              {t.label} <span className="text-text-muted">({t.unit})</span>
            </label>
            <input
              id={`m-${t.id}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={values[t.id] ?? ''}
              onChange={(e) => setValues((s) => ({ ...s, [t.id]: e.target.value }))}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={create.isPending}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {create.isPending ? 'Salvataggio…' : 'Salva misurazione'}
      </button>
      {create.isError && <p className="mt-2 text-xs text-negative">Errore nel salvataggio.</p>}
    </form>
  );
}
