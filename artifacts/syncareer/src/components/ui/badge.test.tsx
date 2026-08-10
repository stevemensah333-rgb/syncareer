
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge status variants', () => {
  it('applies the semantic status classes', () => {
    render(
      <>
        <Badge variant="success">Done</Badge>
        <Badge variant="warning">Due soon</Badge>
        <Badge variant="info">Guide</Badge>
        <Badge variant="destructive">Blocked</Badge>
      </>
    );
    expect(screen.getByText('Done').className).toContain('bg-success');
    expect(screen.getByText('Due soon').className).toContain('bg-warning');
    expect(screen.getByText('Guide').className).toContain('bg-info');
    expect(screen.getByText('Blocked').className).toContain('bg-destructive');
  });
});
