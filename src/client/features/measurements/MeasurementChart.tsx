import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMeasurementSeries } from './useMeasurements';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function MeasurementChart({ typeId, unit }: { typeId: string; unit: string }) {
  const { data = [], isPending } = useMeasurementSeries(typeId);

  if (isPending) return <div className="h-56 animate-pulse rounded-lg bg-slate-100" />;
  if (data.length === 0)
    return <p className="text-sm text-slate-400">Nessun dato per il grafico.</p>;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={shortDate} />
          <YAxis
            tick={{ fontSize: 11 }}
            domain={['dataMin - 1', 'dataMax + 1']}
            unit={unit}
            width={48}
          />
          <Tooltip
            labelFormatter={(label) => (typeof label === 'string' ? shortDate(label) : '')}
          />
          <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
