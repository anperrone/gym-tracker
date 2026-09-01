import { type FormEvent, useState } from 'react';
import { useCreateMeasurement, useMeasurementTypes } from './useMeasurements';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-500" htmlFor="measured-at">
          Data
        </label>
        <input
          id="measured-at"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => (
          <div key={t.id}>
            <label className="block text-xs font-medium text-slate-500" htmlFor={`m-${t.id}`}>
              {t.label} <span className="text-slate-400">({t.unit})</span>
            </label>
            <input
              id={`m-${t.id}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={values[t.id] ?? ''}
              onChange={(e) => setValues((s) => ({ ...s, [t.id]: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={create.isPending}
        className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {create.isPending ? 'Salvataggio…' : 'Salva misurazione'}
      </button>
      {create.isError && <p className="mt-2 text-xs text-red-600">Errore nel salvataggio.</p>}
    </form>
  );
}
