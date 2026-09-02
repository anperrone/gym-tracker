import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorState } from './ErrorState';

describe('<ErrorState />', () => {
  it('mostra titolo e descrizione', () => {
    render(<ErrorState title="Pagina non trovata" description="Il percorso non esiste." />);
    expect(screen.getByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument();
    expect(screen.getByText('Il percorso non esiste.')).toBeInTheDocument();
  });

  it("mostra un'azione opzionale", () => {
    render(<ErrorState title="Errore" action={<a href="/">Torna alla home</a>} />);
    expect(screen.getByRole('link', { name: 'Torna alla home' })).toBeInTheDocument();
  });
});
