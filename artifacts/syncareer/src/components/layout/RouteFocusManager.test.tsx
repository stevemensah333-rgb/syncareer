import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteFocusManager } from './RouteFocusManager';

function Page({ name, destination }: { name: string; destination?: string }) {
  return (
    <>
      {destination && <Link to={destination}>Open next page</Link>}
      <main id="main-content" tabIndex={-1}>{name}</main>
    </>
  );
}

describe('RouteFocusManager', () => {
  it('moves focus to the main landmark after navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/first']}>
        <RouteFocusManager />
        <Routes>
          <Route path="/first" element={<Page name="First page" destination="/second" />} />
          <Route path="/second" element={<Page name="Second page" />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open next page' }));

    const main = await screen.findByText('Second page');
    await waitFor(() => expect(document.activeElement).toBe(main));
  });
});
