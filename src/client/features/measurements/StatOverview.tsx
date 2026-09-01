import { StatTile } from '@/components/StatTile';
import { computeLatestStats } from './stats';
import { useMeasurements, useMeasurementTypes } from './useMeasurements';

export function StatOverview() {
  const { data: entries = [], isPending } = useMeasurements();
  const { data: types = [], isPending: typesPending } = useMeasurementTypes();

  if (isPending || typesPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Nessuna misura ancora: aggiungine una per vedere la sintesi.
      </p>
    );
  }

  const stats = computeLatestStats(entries, types).filter((s) => s.value !== null);
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <StatTile
          key={s.typeId}
          label={s.label}
          value={s.value}
          unit={s.unit}
          delta={s.delta}
          precision={s.precision}
        />
      ))}
    </div>
  );
}
