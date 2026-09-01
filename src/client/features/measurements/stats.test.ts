import type { MeasurementEntryDto, MeasurementTypeDto } from '@shared/schemas';
import { describe, expect, it } from 'vitest';
import { computeLatestStats } from './stats';

const types: MeasurementTypeDto[] = [
  {
    id: 'mt_weight',
    key: 'weight',
    label: 'Peso',
    unit: 'kg',
    precision: 1,
    sortOrder: 1,
    isCustom: false,
  },
  {
    id: 'mt_arm',
    key: 'arm',
    label: 'Braccio',
    unit: 'cm',
    precision: 1,
    sortOrder: 2,
    isCustom: false,
  },
];

function entry(
  id: string,
  measuredAt: string,
  values: Record<string, number>,
): MeasurementEntryDto {
  return {
    id,
    measuredAt,
    notes: null,
    values: Object.entries(values).map(([typeId, value]) => ({ typeId, value })),
  };
}

describe('computeLatestStats', () => {
  it('serie vuota → valori e delta nulli', () => {
    const stats = computeLatestStats([], types);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ typeId: 'mt_weight', value: null, delta: null });
  });

  it('una sola misura → valore presente, delta nullo', () => {
    const stats = computeLatestStats([entry('e1', '2025-01-01', { mt_weight: 70 })], types);
    const weight = stats.find((s) => s.typeId === 'mt_weight');
    expect(weight).toMatchObject({ value: 70, delta: null });
  });

  it('usa la misura più recente e calcola il delta vs la precedente (ordine input indifferente)', () => {
    const stats = computeLatestStats(
      [
        entry('old', '2025-01-01', { mt_weight: 70 }),
        entry('new', '2025-02-01', { mt_weight: 72.5 }),
      ],
      types,
    );
    const weight = stats.find((s) => s.typeId === 'mt_weight');
    expect(weight?.value).toBe(72.5);
    expect(weight?.delta).toBeCloseTo(2.5, 5);
  });

  it('salta le entry senza quella metrica (buchi) per il calcolo del delta', () => {
    const stats = computeLatestStats(
      [
        entry('e1', '2025-03-01', { mt_weight: 74 }), // solo peso
        entry('e2', '2025-02-01', { mt_weight: 73, mt_arm: 30 }),
        entry('e3', '2025-01-01', { mt_arm: 29 }),
      ],
      types,
    );
    const arm = stats.find((s) => s.typeId === 'mt_arm');
    // ultimo braccio = 30 (feb), precedente = 29 (gen) → delta +1
    expect(arm?.value).toBe(30);
    expect(arm?.delta).toBeCloseTo(1, 5);
  });
});
