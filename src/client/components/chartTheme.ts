export type ChartColors = {
  line: string;
  grid: string;
  axis: string;
  dotStroke: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

// Fallback usati quando i token CSS non sono risolvibili (SSR / jsdom / no-CSS).
const FALLBACK: ChartColors = {
  line: '#047857',
  grid: '#e5e8ec',
  axis: '#5b6673',
  dotStroke: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e8ec',
  tooltipText: '#0f172a',
};

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

/** Colori del grafico letti dai token CSS correnti (tema-aware); fallback se non disponibili. */
export function getChartColors(): ChartColors {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return FALLBACK;
  }
  const s = window.getComputedStyle(document.documentElement);
  return {
    line: cssVar(s, '--chart-line', FALLBACK.line),
    grid: cssVar(s, '--chart-grid', FALLBACK.grid),
    axis: cssVar(s, '--text-muted', FALLBACK.axis),
    dotStroke: cssVar(s, '--surface', FALLBACK.dotStroke),
    tooltipBg: cssVar(s, '--surface', FALLBACK.tooltipBg),
    tooltipBorder: cssVar(s, '--border', FALLBACK.tooltipBorder),
    tooltipText: cssVar(s, '--text', FALLBACK.tooltipText),
  };
}

/** Data breve (gg/mm) per l'asse X e i tooltip dei grafici di andamento. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

/** Etichetta numerica compatta per assi/tooltip (max 1 decimale, senza zeri inutili). */
export function formatAxisValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  return (Math.round(value * 10) / 10).toString();
}

/** Dominio Y con padding, robusto a serie vuote o a valore singolo. */
export function computeYDomain(values: number[]): [number, number] {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return [0, 1];

  const min = Math.min(...nums);
  const max = Math.max(...nums);

  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.05;
    return [min - pad, max + pad];
  }

  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}
