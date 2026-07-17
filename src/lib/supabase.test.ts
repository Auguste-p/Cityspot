import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// hasSupabaseConfig / getSupabaseClient are computed from import.meta.env at module
// load time, so each scenario needs a fresh module instance with its own env stub.
describe('getSupabaseClient / hasSupabaseConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('has no config when the URL or the anon key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { hasSupabaseConfig, getSupabaseClient } = await import('./supabase');

    expect(hasSupabaseConfig).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it('rejects a secret/service-role key even when a URL is present (SEC-01)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_secret_abcdef123456');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { hasSupabaseConfig, getSupabaseClient } = await import('./supabase');

    expect(hasSupabaseConfig).toBe(false);
    expect(getSupabaseClient()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('secret/service role key'));

    warnSpy.mockRestore();
  });

  it('builds and memoizes a client when a valid anon key and URL are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-public-key');

    const { hasSupabaseConfig, getSupabaseClient } = await import('./supabase');

    expect(hasSupabaseConfig).toBe(true);
    const client = getSupabaseClient();
    expect(client).not.toBeNull();
    expect(getSupabaseClient()).toBe(client);
  });
});
