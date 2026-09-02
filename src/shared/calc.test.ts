import { describe, expect, it } from 'vitest';
import { epley1RM, roundTo, setVolume } from './calc';

describe('calcoli derivati', () => {
  it('epley1RM applica la formula di Epley w·(1+reps/30)', () => {
    // reps=1 → 100·31/30 = 103.33 (Epley sovrastima leggermente a 1 rep)
    expect(roundTo(epley1RM(100, 1), 2)).toBe(103.33);
    // reps=10 → 100·(1+10/30) = 133.33
    expect(roundTo(epley1RM(100, 10), 1)).toBe(133.3);
  });

  it('epley1RM cresce con le ripetizioni', () => {
    expect(epley1RM(60, 12)).toBeGreaterThan(epley1RM(60, 8));
  });

  it('setVolume = peso × reps', () => {
    expect(setVolume(60, 12)).toBe(720);
    expect(setVolume(0, 10)).toBe(0);
  });

  it('roundTo arrotonda alle cifre indicate', () => {
    expect(roundTo(133.3333, 1)).toBe(133.3);
    expect(roundTo(133.35, 1)).toBe(133.4);
    expect(roundTo(133.3333, 0)).toBe(133);
  });

  it('roundTo usa 1 decimale di default', () => {
    expect(roundTo(133.3333)).toBe(133.3);
    expect(roundTo(0.05)).toBe(0.1);
  });
});
