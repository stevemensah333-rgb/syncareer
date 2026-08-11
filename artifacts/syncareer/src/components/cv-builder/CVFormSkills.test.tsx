import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CVFormSkills } from './CVFormSkills';

describe('CVFormSkills accessibility', () => {
  it('labels skill entry and exposes keyboard-operable add and remove controls', () => {
    const onChange = vi.fn();
    render(<CVFormSkills skills={['SQL']} onChange={onChange} />);

    const input = screen.getByRole('textbox', { name: 'Add a skill' });
    fireEvent.change(input, { target: { value: 'Python' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['SQL', 'Python']);

    const remove = screen.getByRole('button', { name: 'Remove SQL' });
    expect(remove.className).toContain('focus-visible:ring-2');
    fireEvent.click(remove);
    expect(onChange).toHaveBeenLastCalledWith([]);

    const suggested = screen.getByRole('button', { name: 'Add Java' });
    expect(suggested.className).toContain('min-h-11');
  });
});
