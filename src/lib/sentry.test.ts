import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from '@sentry/react';

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('logSecurityEvent', () => {
  it('does nothing without a configured DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { logSecurityEvent } = await import('./sentry');

    logSecurityEvent('tentative refusée');

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('forwards the message as a warning-level event when a DSN is configured', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.example/1');
    const { logSecurityEvent } = await import('./sentry');

    logSecurityEvent('tentative refusée', { issueId: 'i1' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('tentative refusée', {
      level: 'warning',
      extra: { issueId: 'i1' },
    });
  });
});
