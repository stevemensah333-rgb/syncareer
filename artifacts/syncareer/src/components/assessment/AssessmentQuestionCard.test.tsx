import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentQuestionCard } from './AssessmentQuestionCard';

describe('AssessmentQuestionCard accessibility', () => {
  it('groups a question with five labelled keyboard-operable answers', () => {
    const onChange = vi.fn();
    render(<AssessmentQuestionCard question={{ id: 31, text: 'I enjoy practical work.', category: 'work_interest', subcategory: 'R' }} questionNumber={31} onChange={onChange} />);
    expect(screen.getByRole('group', { name: /31.*practical work/i })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    radios[0]!.focus();
    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
    fireEvent.click(screen.getByLabelText('Agree'));
    expect(onChange).toHaveBeenCalledWith(31, 4);
  });
});
