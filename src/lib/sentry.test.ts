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

describe('initSentry', () => {
  it('does not initialize Sentry without a configured DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry } = await import('./sentry');

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry with the configured DSN and no tracing', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@sentry.example/1');
    const { initSentry } = await import('./sentry');

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'https://fake@sentry.example/1',
      tracesSampleRate: 0,
    });
  });
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
      tags: { security_event: true },
      extra: { issueId: 'i1' },
    });
  });
});
