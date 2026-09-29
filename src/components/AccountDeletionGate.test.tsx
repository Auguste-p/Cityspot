// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  restoreOwnAccount: vi.fn(),
  signOut: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { restoreOwnAccount, signOut } from '../services/authService';
import { AccountDeletionGate } from './AccountDeletionGate';

const mockedUseUser = vi.mocked(useUser);
const mockedRestoreOwnAccount = vi.mocked(restoreOwnAccount);
const mockedSignOut = vi.mocked(signOut);

const DELETED_AT = new Date('2026-09-01T00:00:00.000Z');

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AccountDeletionGate accessibility (RGAA / axe-core)', () => {
  it('has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser: vi.fn(), pendingDeletion: null });

    const { container } = render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    await expectNoA11yViolations(container);
  });
});

describe('AccountDeletionGate', () => {
  it('restores the account and refreshes the session on confirmation', async () => {
    const refreshUser = vi.fn();
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser, pendingDeletion: null });
    mockedRestoreOwnAccount.mockResolvedValue(undefined);

    render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    fireEvent.click(screen.getByText('Restaurer mon compte'));

    await waitFor(() => expect(mockedRestoreOwnAccount).toHaveBeenCalled());
    expect(refreshUser).toHaveBeenCalled();
    expect(mockedSignOut).not.toHaveBeenCalled();
  });

  it('signs out without restoring when declined', async () => {
    const refreshUser = vi.fn();
    mockedUseUser.mockReturnValue({ user: null, loading: false, isMunicipalUser: false, refreshUser, pendingDeletion: null });
    mockedSignOut.mockResolvedValue(undefined);

    render(<AccountDeletionGate deletedAt={DELETED_AT} />);
    fireEvent.click(screen.getByText('Se déconnecter'));

    await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
    expect(mockedRestoreOwnAccount).not.toHaveBeenCalled();
  });
});
