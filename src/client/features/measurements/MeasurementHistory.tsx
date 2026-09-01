import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import { useDeleteMeasurement, useMeasurements, useMeasurementTypes } from './useMeasurements';

export function MeasurementHistory() {
  const { data: entries = [], isPending } = useMeasurements();
  const { data: types = [] } = useMeasurementTypes();
  const del = useDeleteMeasurement();
  const typeById = new Map(types.map((t) => [t.id, t]));

  if (isPending) return <p className="text-sm text-text-muted">Caricamento…</p>;
  if (entries.length === 0)
    return <p className="text-sm text-text-muted">Nessuna misurazione ancora.</p>;

  return (
    <ul aria-label="Storico misurazioni" className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">
              {new Date(e.measuredAt).toLocaleDateString('it-IT')}
            </span>
            <IconButton label="Elimina" onClick={() => del.mutate(e.id)}>
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted tabular-nums">
            {e.values.map((v) => {
              const t = typeById.get(v.typeId);
              return (
                <span key={v.typeId}>
                  {t?.label ?? v.typeId}: <b className="text-text">{v.value}</b>
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
