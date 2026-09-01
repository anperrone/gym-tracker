import type { ProgressPointDto } from '@shared/schemas';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  computeYDomain,
  formatAxisValue,
  getChartColors,
} from '@/features/measurements/chartTheme';
import { useThemeAttribute } from '@/lib/theme';

export type ProgressMetric = 'topWeight' | 'best1RM' | 'volume';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function ProgressChart({
  points,
  metric,
  unit,
}: {
  points: ProgressPointDto[];
  metric: ProgressMetric;
  unit: string;
}) {
  // Ri-renderizza al cambio tema, così i colori risolti dai token CSS restano aggiornati.
  useThemeAttribute();

  if (points.length === 0)
    return <p className="text-sm text-text-muted">Nessun dato per il grafico.</p>;

  const colors = getChartColors();
  const domain = computeYDomain(points.map((p) => p[metric]));
  const last = points[points.length - 1];
  const gradientId = `progress-${metric}`;

  return (
    <div className="w-full">
      {unit ? <p className="mb-1 text-xs font-medium text-text-muted">{unit}</p> : null}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: colors.axis }}
              tickFormatter={shortDate}
              tickMargin={8}
              minTickGap={24}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.axis }}
              tickFormatter={(v) => formatAxisValue(v as number)}
              domain={domain}
              width={44}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 12,
                color: colors.tooltipText,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.axis }}
              itemStyle={{ color: colors.tooltipText }}
              formatter={(value) => [
                `${formatAxisValue(value as number)}${unit ? ` ${unit}` : ''}`,
                'Valore',
              ]}
              labelFormatter={(label) => (typeof label === 'string' ? shortDate(label) : '')}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={colors.line}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: colors.line, stroke: colors.dotStroke, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={last.date}
              y={last[metric]}
              r={4}
              fill={colors.line}
              stroke={colors.dotStroke}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
