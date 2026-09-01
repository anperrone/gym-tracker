import { TrendChart } from '@/components/TrendChart';
import { useMeasurementSeries } from './useMeasurements';

export function MeasurementChart({ typeId, unit }: { typeId: string; unit: string }) {
  const { data = [], isPending } = useMeasurementSeries(typeId);

  if (isPending) return <div className="h-56 animate-pulse rounded-xl bg-surface-2" />;
  return <TrendChart data={data} dataKey="value" unit={unit} />;
}
