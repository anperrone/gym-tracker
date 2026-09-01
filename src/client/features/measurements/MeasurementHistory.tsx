import { useDeleteMeasurement, useMeasurements, useMeasurementTypes } from './useMeasurements';

export function MeasurementHistory() {
  const { data: entries = [], isPending } = useMeasurements();
  const { data: types = [] } = useMeasurementTypes();
  const del = useDeleteMeasurement();
  const typeById = new Map(types.map((t) => [t.id, t]));

  if (isPending) return <p className="text-sm text-slate-400">Caricamento…</p>;
  if (entries.length === 0)
    return <p className="text-sm text-slate-400">Nessuna misurazione ancora.</p>;

  return (
    <ul aria-label="Storico misurazioni" className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {new Date(e.measuredAt).toLocaleDateString('it-IT')}
            </span>
            <button
              type="button"
              onClick={() => del.mutate(e.id)}
              className="text-xs font-medium text-red-600"
            >
              Elimina
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {e.values.map((v) => {
              const t = typeById.get(v.typeId);
              return (
                <span key={v.typeId}>
                  {t?.label ?? v.typeId}: <b>{v.value}</b>
                  {t ? ` ${t.unit}` : ''}
                </span>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
