// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, it, vi } from 'vitest';
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
});
