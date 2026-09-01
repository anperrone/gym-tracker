import type { ProgressPointDto } from '@shared/schemas';
import { TrendChart } from '@/components/TrendChart';

export type ProgressMetric = 'topWeight' | 'best1RM' | 'volume';

export function ProgressChart({
  points,
  metric,
  unit,
}: {
  points: ProgressPointDto[];
  metric: ProgressMetric;
  unit: string;
}) {
  return <TrendChart data={points} dataKey={metric} unit={unit} />;
}
