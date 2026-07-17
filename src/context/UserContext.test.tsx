// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../lib/supabase';
import { UserProvider, useUser } from './UserContext';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

function stubAuth(getUser: () => Promise<{ data: { user: any } }>) {
  return {
    auth: {
      getUser: vi.fn(getUser),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  } as any;
}

function Probe() {
  const { user, loading, isMunicipalUser } = useUser();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="municipal">{String(isMunicipalUser)}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('UserProvider', () => {
  it('defaults an authenticated user with no role metadata to citizen', async () => {
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(async () => ({ data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} } } })),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('email')).textContent).toBe('a@b.com');
    expect(screen.getByTestId('role').textContent).toBe('citizen');
    expect(screen.getByTestId('municipal').textContent).toBe('false');
  });

  it('flags a municipal user from user_metadata.role', async () => {
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(async () => ({
        data: { user: { id: 'u2', email: 'city@x.com', user_metadata: { role: 'municipal' } } },
      })),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('municipal')).textContent).toBe('true');
  });

  it('resolves to no user when unauthenticated', async () => {
    mockedGetSupabaseClient.mockReturnValue(stubAuth(async () => ({ data: { user: null } })));

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('email')).textContent).toBe('none');
  });

  it('falls back to no user when the initial fetch throws', async () => {
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(async () => {
        throw new Error('network down');
      }),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('email')).textContent).toBe('none');
  });
});

describe('useUser', () => {
  it('throws when used outside a UserProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bare = () => {
      useUser();
      return null;
    };

    expect(() => render(<Bare />)).toThrow('useUser must be used within a UserProvider');
    errorSpy.mockRestore();
  });
});
