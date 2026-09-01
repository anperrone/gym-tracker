import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';
import { TrashIcon } from './icons';

describe('<IconButton />', () => {
  it('espone il nome accessibile e gestisce il click', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Elimina" onClick={onClick}>
        <TrashIcon />
      </IconButton>,
    );

    const btn = screen.getByRole('button', { name: 'Elimina' });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
