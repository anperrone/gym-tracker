import type { ReactNode } from 'react';

/** Contenitore base a tema (superficie + bordo arrotondato). */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface ${className}`}>{children}</div>
  );
}
