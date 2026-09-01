import type { MeasurementEntryDto, MeasurementTypeDto } from '@shared/schemas';

export type MeasurementStat = {
  typeId: string;
  label: string;
  unit: string;
  precision: number;
  /** Ultimo valore registrato per la metrica, o `null` se mai misurata. */
  value: number | null;
  /** Variazione vs la misura precedente della stessa metrica, o `null` se non calcolabile. */
  delta: number | null;
};

/**
 * Per ogni tipo di metrica, ricava l'ultimo valore e il delta rispetto alla misura
 * precedente. Ignora le entry prive di quella metrica (buchi), così il delta confronta
 * sempre due misurazioni effettive della stessa metrica.
 */
export function computeLatestStats(
  entries: MeasurementEntryDto[],
  types: MeasurementTypeDto[],
): MeasurementStat[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  return types.map((t) => {
    const series: number[] = [];
    for (const e of sorted) {
      const found = e.values.find((v) => v.typeId === t.id);
      if (found) series.push(found.value);
    }
    return {
      typeId: t.id,
      label: t.label,
      unit: t.unit,
      precision: t.precision,
      value: series.length > 0 ? series[0] : null,
      delta: series.length >= 2 ? series[0] - series[1] : null,
    };
  });
}
