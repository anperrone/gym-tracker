import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './IconButton';

describe('<IconButton />', () => {
  it('espone un nome accessibile obbligatorio (icona sola)', () => {
    render(
      <IconButton label="Chiudi">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Chiudi' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveAttribute('title', 'Chiudi');
  });

  it('rispetta il target touch minimo (≥44px → h-11 w-11)', () => {
    render(
      <IconButton label="Azione">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Azione' });
    expect(btn.className).toContain('h-11');
    expect(btn.className).toContain('w-11');
  });
});
