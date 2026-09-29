// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../lib/supabase';
import { UserProvider, useUser } from './UserContext';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

function stubAuth(
  getUser: () => Promise<{ data: { user: any } }>,
  profileRow?: { role?: string; cityLat?: number; cityLng?: number; deleted_at?: string },
) {
  return {
    auth: {
      getUser: vi.fn(getUser),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileRow ?? null, error: null }),
        }),
      }),
    }),
  } as any;
}

function Probe() {
  const { user, loading, isMunicipalUser, pendingDeletion } = useUser();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="municipal">{String(isMunicipalUser)}</span>
      <span data-testid="city-coords">{user?.cityLat ?? 'none'},{user?.cityLng ?? 'none'}</span>
      <span data-testid="pending-deletion">{pendingDeletion ? pendingDeletion.deletedAt.toISOString() : 'none'}</span>
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

  it('flags a municipal user from public.users.role', async () => {
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(
        async () => ({ data: { user: { id: 'u2', email: 'city@x.com', user_metadata: {} } } }),
        { role: 'municipal' },
      ),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('municipal')).textContent).toBe('true');
  });

  it('exposes the city coordinates saved at signup', async () => {
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(
        async () => ({ data: { user: { id: 'u3', email: 'c@x.com', user_metadata: {} } } }),
        { role: 'citizen', cityLat: 45.75, cityLng: 4.85 },
      ),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('city-coords')).textContent).toBe('45.75,4.85');
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

  it('exposes pendingDeletion for an account deleted less than 30 days ago, without a normal user', async () => {
    const deletedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    mockedGetSupabaseClient.mockReturnValue(
      stubAuth(
        async () => ({ data: { user: { id: 'u4', email: 'd@x.com', user_metadata: {} } } }),
        { role: 'citizen', deleted_at: deletedAt.toISOString() },
      ),
    );

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('pending-deletion')).textContent).toBe(deletedAt.toISOString());
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('signs out silently for an account deleted 30+ days ago', async () => {
    const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    const client = stubAuth(
      async () => ({ data: { user: { id: 'u5', email: 'old@x.com', user_metadata: {} } } }),
      { role: 'citizen', deleted_at: deletedAt.toISOString() },
    );
    mockedGetSupabaseClient.mockReturnValue(client);

    render(<UserProvider><Probe /></UserProvider>);

    expect((await screen.findByTestId('pending-deletion')).textContent).toBe('none');
    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(client.auth.signOut).toHaveBeenCalled();
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
