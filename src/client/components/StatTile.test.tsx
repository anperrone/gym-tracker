import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatTile } from './StatTile';

describe('<StatTile />', () => {
  it('mostra etichetta, valore e unità', () => {
    render(<StatTile label="Peso" value={72.4} unit="kg" />);
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('72,4')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('mostra un placeholder quando il valore manca', () => {
    render(<StatTile label="Torace" value={null} unit="cm" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('mostra il delta con direzione (valore assoluto)', () => {
    render(<StatTile label="Peso" value={70} unit="kg" delta={-2.5} />);
    // direzione verso il basso + variazione assoluta
    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('2,5 kg')).toBeInTheDocument();
  });

  it('non mostra il delta quando è zero o assente', () => {
    render(<StatTile label="Peso" value={70} unit="kg" delta={0} />);
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
  });
});
