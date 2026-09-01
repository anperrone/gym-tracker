import { describe, expect, it } from 'vitest';
import { computeYDomain, formatAxisValue, getChartColors } from './chartTheme';

describe('formatAxisValue', () => {
  it('arrotonda a 1 decimale senza zeri inutili', () => {
    expect(formatAxisValue(66.94)).toBe('66.9');
    expect(formatAxisValue(70)).toBe('70');
    expect(formatAxisValue(88.0)).toBe('88');
  });

  it('gestisce valori non finiti', () => {
    expect(formatAxisValue(Number.NaN)).toBe('');
  });
});

describe('computeYDomain', () => {
  it('serie vuota → dominio di default', () => {
    expect(computeYDomain([])).toEqual([0, 1]);
  });

  it('valore singolo → padding attorno al valore', () => {
    const [lo, hi] = computeYDomain([80]);
    expect(lo).toBeLessThan(80);
    expect(hi).toBeGreaterThan(80);
  });

  it('range → padding del 10% sotto e sopra', () => {
    // min 70, max 90 → pad 2 → [68, 92]
    expect(computeYDomain([70, 90, 80])).toEqual([68, 92]);
  });

  it('ignora valori non finiti', () => {
    expect(computeYDomain([Number.NaN, 70, 90])).toEqual([68, 92]);
  });
});

describe('getChartColors', () => {
  it('ritorna i fallback quando i token CSS non sono risolvibili (jsdom)', () => {
    const colors = getChartColors();
    expect(typeof colors.line).toBe('string');
    expect(colors.line.length).toBeGreaterThan(0);
    expect(typeof colors.grid).toBe('string');
    expect(typeof colors.axis).toBe('string');
  });
});
