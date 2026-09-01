type StatTileProps = {
  label: string;
  value: number | null;
  unit?: string;
  /** Variazione rispetto alla misura precedente (mostrata neutra: direzione, non giudizio). */
  delta?: number | null;
  precision?: number;
};

function formatNumber(value: number, precision: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  }).format(value);
}

/** Tile di sintesi: etichetta + valore grande + unità + delta neutro vs misura precedente. */
export function StatTile({ label, value, unit, delta, precision = 1 }: StatTileProps) {
  const hasValue = value !== null && Number.isFinite(value);
  const hasDelta = delta != null && Number.isFinite(delta) && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
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
    </div>
  );
}
