import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) {
    return;
  }

  Sentry.init({ dsn, tracesSampleRate: 0 });
}

// Refus d'autorisation métier (RLS, garde de route) : pas des bugs, mais des
// événements de sécurité (A09) — sans ça, un contournement RLS ou une
// tentative d'accès à /municipal ne laisse aucune trace.
export function logSecurityEvent(message: string, extra?: Record<string, unknown>) {
  if (!dsn) {
    return;
  }

  // Tag dédié : permet à une règle d'alerte Sentry de cibler uniquement ces
  // événements (volume anormal de refus), sans les confondre avec un crash JS.
  Sentry.captureMessage(message, { level: 'warning', tags: { security_event: true }, extra });
}
