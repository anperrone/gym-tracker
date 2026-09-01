import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('<Card />', () => {
  it('rende i figli', () => {
    render(<Card>contenuto card</Card>);
    expect(screen.getByText('contenuto card')).toBeInTheDocument();
  });
});
