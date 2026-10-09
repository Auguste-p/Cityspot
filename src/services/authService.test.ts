// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../lib/supabase';
import {
  getCurrentUser,
  getUserProfile,
  signIn,
  signOut,
  signUp,
  updateUserProfile,
  deleteOwnAccount,
  restoreOwnAccount,
} from './authService';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

afterEach(() => {
  mockedGetSupabaseClient.mockReset();
});

// Preuve d'acceptation des CGU, transmise telle quelle via user_metadata.
const TERMS = { termsVersion: '2026-10-09', termsAcceptedAt: '2026-10-09T10:00:00.000Z' };

describe('signUp', () => {
  function emailNotTaken() {
    return vi.fn().mockResolvedValue({ data: false, error: null });
  }

  it('returns the auth payload on success', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc: emailNotTaken() } as any);

    const result = await signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon', ...TERMS });

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: {
        data: { name: 'A', city: 'Lyon', ...TERMS },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    expect(result).toEqual({ user: { id: '1' } });
  });

  it('throws when supabase returns an error', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signUp: vi.fn().mockResolvedValue({ data: null, error: new Error('invalid email') }) },
      rpc: emailNotTaken(),
    } as any);

    await expect(signUp('bad', 'pw', { name: 'A', city: 'Lyon', ...TERMS })).rejects.toThrow('invalid email');
  });

  it('forwards city coordinates through user_metadata (read by the handle_new_user trigger)', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc: emailNotTaken() } as any);

    await signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon', cityLat: 45.75, cityLng: 4.85, ...TERMS });

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: {
        data: { name: 'A', city: 'Lyon', cityLat: 45.75, cityLng: 4.85, ...TERMS },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
  });

  it('forwards the INSEE code of the chosen commune through user_metadata', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc: emailNotTaken() } as any);

    await signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon, Rhône', cityInsee: '69123', ...TERMS });

    expect(signUpMock.mock.calls[0][0].options.data).toMatchObject({ cityInsee: '69123' });
  });

  it('refuses to sign up when the email is already registered (auth.users or public.users)', async () => {
    const signUpMock = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc } as any);

    await expect(signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon', ...TERMS })).rejects.toThrow(
      'Un compte existe déjà avec cet email.',
    );
    expect(rpc).toHaveBeenCalledWith('email_exists', { check_email: 'a@b.com' });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('propagates an error from the email-existence check itself', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rpc unavailable') });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: vi.fn() }, rpc } as any);

    await expect(signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon', ...TERMS })).rejects.toThrow('rpc unavailable');
  });
});

describe('signIn', () => {
  it('returns the session data on success', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }) },
    } as any);

    await expect(signIn('a@b.com', 'pw')).resolves.toEqual({ session: { access_token: 'tok' } });
  });

  it('throws on bad credentials', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: new Error('bad credentials') }) },
    } as any);

    await expect(signIn('a@b.com', 'wrong')).rejects.toThrow('bad credentials');
  });
});

describe('signOut', () => {
  it('throws on error', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: new Error('boom') }) },
    } as any);

    await expect(signOut()).rejects.toThrow('boom');
  });

  it('resolves silently on success', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    } as any);

    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe('getCurrentUser', () => {
  it('returns the current user', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    } as any);

    await expect(getCurrentUser()).resolves.toEqual({ id: 'u1' });
  });

  it('resolves null instead of throwing when there is no session (anonymous visitor)', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
        }),
      },
    } as any);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('still throws on other auth errors', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: null, error: new Error('network error') }) },
    } as any);

    await expect(getCurrentUser()).rejects.toThrow('network error');
  });
});

describe('getUserProfile', () => {
  it('queries the users table by id', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'u1', name: 'A' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    mockedGetSupabaseClient.mockReturnValue({ from } as any);

    await expect(getUserProfile('u1')).resolves.toEqual({ id: 'u1', name: 'A' });
    expect(from).toHaveBeenCalledWith('users');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});

describe('updateUserProfile', () => {
  it('throws when the update is rejected (e.g. RLS)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('rls violation') });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    mockedGetSupabaseClient.mockReturnValue({ from } as any);

    await expect(updateUserProfile('u1', { name: 'A' })).rejects.toThrow('rls violation');
  });

  it('updates the profile with the given fields', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    mockedGetSupabaseClient.mockReturnValue({ from } as any);

    await updateUserProfile('u1', { name: 'A', phone: '0601020304' });

    expect(update).toHaveBeenCalledWith({ name: 'A', phone: '0601020304' });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('writes the INSEE code to the city_insee column, and leaves it alone when not given', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockedGetSupabaseClient.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as any);

    await updateUserProfile('u1', { name: 'A', city_insee: '34172' });
    expect(update).toHaveBeenLastCalledWith({ name: 'A', city_insee: '34172' });

    await updateUserProfile('u1', { name: 'A', city_insee: null });
    expect(update).toHaveBeenLastCalledWith({ name: 'A', city_insee: null });

    await updateUserProfile('u1', { name: 'A' });
    expect(update).toHaveBeenLastCalledWith({ name: 'A' });
  });
});

describe('deleteOwnAccount', () => {
  it('calls the delete_own_account RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await deleteOwnAccount();

    expect(rpc).toHaveBeenCalledWith('delete_own_account');
  });

  it('throws when the RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('boom') });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await expect(deleteOwnAccount()).rejects.toThrow('boom');
  });
});

describe('restoreOwnAccount', () => {
  it('calls the restore_own_account RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await restoreOwnAccount();

    expect(rpc).toHaveBeenCalledWith('restore_own_account');
  });

  it('throws when the RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('boom') });
    mockedGetSupabaseClient.mockReturnValue({ rpc } as any);

    await expect(restoreOwnAccount()).rejects.toThrow('boom');
  });
});
