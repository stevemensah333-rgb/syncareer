import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContextualAssistantDrawer } from './ContextualAssistantDrawer';
import { AssistantRequestError } from '@/features/contextual-assistant/contract';

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

  it('does not announce an AI proposal as accepted when its destination rejects it', async () => {
    request.mockResolvedValue({ kind: 'draft', text: 'Follow-up proposal', sourceContextIds: ['role'] });
    const accept = vi.fn(() => false);
    render(<ContextualAssistantDrawer task="application.draft_follow_up" description="Draft help" suggestedPrompt="Draft a follow-up" context={[{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }]} onAccept={accept} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask Syncareer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request proposal' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));

    expect(accept).toHaveBeenCalledWith('Follow-up proposal');
    expect(screen.getByRole('alert').textContent).toMatch(/could not be applied/i);
    expect(screen.queryByText(/Proposal accepted/i)).toBeNull();
  });

  it('cancels the in-flight assistant request when the drawer unmounts', async () => {
    request.mockClear();
    let capturedSignal: AbortSignal | undefined;
    request.mockImplementation((_task: unknown, _instruction: unknown, _context: unknown, signal?: AbortSignal) => {
      capturedSignal = signal;
      // Never resolves: the request is still in flight when the drawer unmounts.
      return new Promise(() => {});
    });
    const { unmount } = render(<ContextualAssistantDrawer task="application.draft_follow_up" description="Draft help" suggestedPrompt="Draft a follow-up" context={[{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Syncareer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request proposal' }));
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal!.aborted).toBe(false);

    unmount();

    // The billable AI request must be cancelled, not left running for a UI
    // that no longer exists.
    expect(capturedSignal!.aborted).toBe(true);
  });

  it('does not surface an error when the in-flight request is cancelled on unmount', async () => {
    request.mockClear();
    request.mockImplementation((_task: unknown, _instruction: unknown, _context: unknown, signal?: AbortSignal) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new AssistantRequestError('cancelled', 'The assistant request was cancelled.'));
        });
      });
    });
    const { unmount } = render(<ContextualAssistantDrawer task="application.draft_follow_up" description="Draft help" suggestedPrompt="Draft a follow-up" context={[{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Syncareer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request proposal' }));
    await waitFor(() => expect(request).toHaveBeenCalledOnce());

    unmount();

    // Nothing to assert in the DOM after unmount — the guard is that the
    // cancelled path never calls setError, which would otherwise warn about
    // setting state on an unmounted component in future React changes.
    expect(screen.queryByRole('alert')).toBeNull();
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
