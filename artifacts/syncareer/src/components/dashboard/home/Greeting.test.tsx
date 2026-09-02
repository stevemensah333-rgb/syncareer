import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Greeting } from './Greeting';

describe('Greeting', () => {
  it('renders time-based greeting with first name', () => {
    render(<Greeting fullName="Ama Mensah" major="Computer Science" school="UG" />);
    expect(screen.getByText(/Ama/)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Application Desk' })).toBeTruthy();
    expect(screen.getByText(/Computer Science/)).toBeTruthy();
  });

  it('renders without name', () => {
    render(<Greeting fullName={null} />);
    // Should show Good morning/afternoon/evening
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });
});
