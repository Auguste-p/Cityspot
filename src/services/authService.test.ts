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
} from './authService';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

afterEach(() => {
  mockedGetSupabaseClient.mockReset();
});

describe('signUp', () => {
  function emailNotTaken() {
    return vi.fn().mockResolvedValue({ data: false, error: null });
  }

  it('returns the auth payload on success', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc: emailNotTaken() } as any);

    const result = await signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon' });

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { name: 'A', city: 'Lyon' } },
    });
    expect(result).toEqual({ user: { id: '1' } });
  });

  it('throws when supabase returns an error', async () => {
    mockedGetSupabaseClient.mockReturnValue({
      auth: { signUp: vi.fn().mockResolvedValue({ data: null, error: new Error('invalid email') }) },
      rpc: emailNotTaken(),
    } as any);

    await expect(signUp('bad', 'pw', { name: 'A', city: 'Lyon' })).rejects.toThrow('invalid email');
  });

  it('forwards city coordinates through user_metadata (read by the handle_new_user trigger)', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc: emailNotTaken() } as any);

    await signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon', cityLat: 45.75, cityLng: 4.85 });

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { name: 'A', city: 'Lyon', cityLat: 45.75, cityLng: 4.85 } },
    });
  });

  it('refuses to sign up when the email is already registered (auth.users or public.users)', async () => {
    const signUpMock = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: signUpMock }, rpc } as any);

    await expect(signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon' })).rejects.toThrow(
      'Un compte existe déjà avec cet email.',
    );
    expect(rpc).toHaveBeenCalledWith('email_exists', { check_email: 'a@b.com' });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('propagates an error from the email-existence check itself', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rpc unavailable') });
    mockedGetSupabaseClient.mockReturnValue({ auth: { signUp: vi.fn() }, rpc } as any);

    await expect(signUp('a@b.com', 'pw', { name: 'A', city: 'Lyon' })).rejects.toThrow('rpc unavailable');
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
});
