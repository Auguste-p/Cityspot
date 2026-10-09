// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { Layout } from './Layout';

const mockedUseUser = vi.mocked(useUser);

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Carte des signalements</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Layout accessibility (RGAA / axe-core)', () => {
  it('the shell for a citizen account has no violation', async () => {
    mockedUseUser.mockReturnValue({
      user: { id: 'u1', email: 'a@b.com', role: 'citizen' },
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
    });

    const { container } = renderLayout();
    await screen.findByText('Carte des signalements');
    await expectNoA11yViolations(container);
  });

  it('the shell for a municipal account (extra nav button) has no violation', async () => {
    mockedUseUser.mockReturnValue({
      user: { id: 'u2', email: 'city@x.com', role: 'municipal' },
      loading: false,
      isMunicipalUser: true,
      refreshUser: vi.fn(),
    });

    const { container } = renderLayout();
    await screen.findByText('Carte des signalements');
    await expectNoA11yViolations(container);
  });

  it('pins the shell to the screen so that only <main> scrolls (no page-within-page scrolling)', async () => {
    mockedUseUser.mockReturnValue({
      user: { id: 'u1', email: 'a@b.com', role: 'citizen' },
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
    });

    const { container } = renderLayout();
    await screen.findByText('Carte des signalements');
    // Les règles .app-shell / .app-main / html:has(.app-shell) sont dans src/index.css.
    expect(container.querySelector('.app-shell')).toBeTruthy();
    expect(container.querySelector('main.app-main')).toBeTruthy();
    expect(container.querySelector('.h-screen')).toBeNull();
    // Un `sticky` ici se collait au sommet sur Safari (cf. CHANGELOG) : la barre est un simple dernier élément de la colonne.
    expect(container.querySelector('nav')?.className).not.toMatch(/sticky/);
  });

  it('does not show the legal links on every screen (only on the login page and in the settings)', async () => {
    mockedUseUser.mockReturnValue({
      user: { id: 'u1', email: 'a@b.com', role: 'citizen' },
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
    });

    renderLayout();
    await screen.findByText('Carte des signalements');
    expect(screen.queryByRole('navigation', { name: 'Informations légales' })).toBeNull();
  });

  it('the account-deletion gate has no violation', async () => {
    mockedUseUser.mockReturnValue({
      user: null,
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
      pendingDeletion: { deletedAt: new Date('2026-09-01T00:00:00.000Z') },
    });

    const { container } = renderLayout();
    await screen.findByText('Compte supprimé');
    await expectNoA11yViolations(container);
  });
});
