import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  /** Nome accessibile del pulsante (obbligatorio: il contenuto è solo un'icona). */
  label: string;
  children: ReactNode;
  className?: string;
};

/** Pulsante a sola icona, con nome accessibile obbligatorio. */
export function IconButton({ label, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:text-text ${className}`}
    >
      {children}
    </button>
  );
}
