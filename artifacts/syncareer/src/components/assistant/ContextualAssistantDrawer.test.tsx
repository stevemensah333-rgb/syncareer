import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContextualAssistantDrawer } from './ContextualAssistantDrawer';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/features/contextual-assistant/contract', async (load) => {
  const actual = await load<typeof import('@/features/contextual-assistant/contract')>();
  return { ...actual, requestContextualAssistance: request };
});

describe('ContextualAssistantDrawer', () => {
  it('shows actual context chips, removes optional personal context, and supports accept and undo', async () => {
    request.mockResolvedValue({ kind: 'draft', text: 'Follow-up proposal', sourceContextIds: ['role'] });
    const accept = vi.fn(); const undo = vi.fn();
    render(<ContextualAssistantDrawer task="application.draft_follow_up" description="Draft help" suggestedPrompt="Draft a follow-up" context={[{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }, { id: 'notes', label: 'Application notes', provenance: 'application_notes', content: 'Private note', optional: true, personal: true }]} onAccept={accept} onUndo={undo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Syncareer' }));
    expect(screen.getByText('[Graduate Analyst]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Application notes context' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request proposal' }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0]![2].map((item: { id: string }) => item.id)).toEqual(['role']);
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    expect(accept).toHaveBeenCalledWith('Follow-up proposal');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledOnce();
  });

  it('opens as an accessible mobile-width dialog with keyboard-close support', () => {
    render(<ContextualAssistantDrawer task="opportunity.explain_requirement" description="Explain" context={[{ id: 'role', label: 'Role', provenance: 'opportunity', content: 'Role' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Syncareer' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('w-full');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
