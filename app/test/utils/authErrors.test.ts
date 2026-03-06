import { describe, expect, it } from 'vitest';
import { getFriendlyAuthErrorMessage } from '../../lib/firebase/authErrors';

describe('getFriendlyAuthErrorMessage', () => {
  it('maps invalid credentials for sign-in', () => {
    const message = getFriendlyAuthErrorMessage(
      { code: 'auth/invalid-credential' },
      'signIn'
    );

    expect(message).toBe('Incorrect email or password. Please try again.');
  });

  it('maps network errors to a user-friendly message', () => {
    const message = getFriendlyAuthErrorMessage(
      { code: 'auth/network-request-failed' },
      'signIn'
    );

    expect(message).toBe('Network issue detected. Check your connection and try again.');
  });

  it('maps quota exceeded errors to a user-friendly message', () => {
    const message = getFriendlyAuthErrorMessage(
      { code: 'auth/quota-exceeded' },
      'signIn'
    );

    expect(message).toBe('Login is temporarily unavailable due to service limits. Please try again shortly.');
  });

  it('falls back to flow defaults for unknown errors', () => {
    const message = getFriendlyAuthErrorMessage(new Error('unknown'), 'signIn');

    expect(message).toBe('Unable to sign in right now. Please try again.');
  });
});

