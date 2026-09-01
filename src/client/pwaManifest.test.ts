import { describe, expect, it } from 'vitest';
import { pwaManifest } from './pwaManifest';

describe('manifest PWA', () => {
  it('è installabile (standalone, start_url, icone)', () => {
    expect(pwaManifest.name).toBe('Gym Tracker');
    expect(pwaManifest.display).toBe('standalone');
    expect(pwaManifest.start_url).toBe('/');
    const icons = pwaManifest.icons ?? [];
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0].src).toBe('pwa-icon.svg');
    expect(icons[0].purpose).toContain('maskable');
  });
});
