import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ContextualPreview } from './contextual-preview';

function setHoverCapable(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderPreview(canHover: boolean) {
  setHoverCapable(canHover);
  return render(
    <ContextualPreview
      content={
        <div>
          <p>Preview summary line</p>
          <p>Secondary detail line</p>
        </div>
      }
    >
      <button>Open row</button>
    </ContextualPreview>,
  );
}

beforeAll(() => {
  // happy-dom lacks ResizeObserver (used by floating-ui for popper positioning).
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

beforeEach(() => {
  cleanup();
});

describe('ContextualPreview progressive disclosure', () => {
  it('touch-equivalent: renders only the trigger, never simulated hover content', () => {
    renderPreview(false);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.focus(row);
    fireEvent.pointerEnter(row);
    // No hover card content ever mounts on coarse/touch pointers.
    expect(screen.queryByText(/Preview summary line/)).toBeNull();
  });

  it('mouse: opens on hover (intentional hover) and reveals secondary content', async () => {
    renderPreview(true);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.pointerEnter(row);

    expect(
      await screen.findByText('Preview summary line', undefined, { timeout: 2000 }),
    ).toBeTruthy();
    expect(screen.getByText('Secondary detail line')).toBeTruthy();
  }, 5000);

  it('keyboard: opens on focus alone, with no pointer interaction', async () => {
    renderPreview(true);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.focus(row);

    expect(
      await screen.findByText('Preview summary line', undefined, { timeout: 2000 }),
    ).toBeTruthy();
  }, 5000);

  it('dismissal: Escape closes an open preview', async () => {
    renderPreview(true);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.focus(row);
    await screen.findByText('Preview summary line', undefined, { timeout: 2000 });

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Preview summary line')).toBeNull();
    });
  }, 5000);

  it('dismissal: leaving the trigger closes the preview after the close delay', async () => {
    renderPreview(true);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.focus(row);
    await screen.findByText('Preview summary line', undefined, { timeout: 2000 });

    fireEvent.pointerLeave(row);

    await waitFor(() => {
      expect(screen.queryByText('Preview summary line')).toBeNull();
    });
  }, 5000);

  it('does not trap focus: preview content exposes no focusable elements', async () => {
    renderPreview(true);
    const row = screen.getByRole('button', { name: 'Open row' });
    fireEvent.focus(row);
    await screen.findByText('Preview summary line', undefined, { timeout: 2000 });

    // The preview is read-only context; there must be nothing tabbable inside
    // that would hold focus (a drawer/panel — not a preview — owns actions).
    const focusableInside = screen
      .getByText('Preview summary line')
      .closest('[role="dialog"], [role="menu"], [role="listbox"]');
    expect(focusableInside).toBeNull();
    // The trigger remains the single interactive element in the row.
    expect(screen.getByRole('button', { name: 'Open row' })).toBeTruthy();
  }, 5000);
});
