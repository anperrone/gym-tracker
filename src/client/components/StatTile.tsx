import { Card } from './Card';

type StatTileProps = {
  label: string;
  value: number | null;
  unit?: string;
  /** Variazione rispetto alla misura precedente (mostrata neutra: direzione, non giudizio). */
  delta?: number | null;
  precision?: number;
};

// Formato numerico coerente col resto della pagina (separatore punto), senza zeri inutili.
function formatNumber(value: number, precision: number): string {
  const factor = 10 ** precision;
  return (Math.round(value * factor) / factor).toString();
}

/** Tile di sintesi: etichetta + valore grande + unità + delta neutro vs misura precedente. */
export function StatTile({ label, value, unit, delta, precision = 1 }: StatTileProps) {
  const hasValue = value !== null && Number.isFinite(value);
  const hasDelta = delta != null && Number.isFinite(delta) && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;

  return (
    <Card className="p-3">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-text tabular-nums">
          {hasValue ? formatNumber(value as number, precision) : '—'}
        </span>
        {unit ? <span className="text-xs text-text-muted">{unit}</span> : null}
      </p>
      {hasDelta ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted tabular-nums">
          <span aria-hidden="true">{deltaUp ? '▲' : '▼'}</span>
          <span>
            {formatNumber(Math.abs(delta as number), precision)}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      ) : null}
    </Card>
  );
}
