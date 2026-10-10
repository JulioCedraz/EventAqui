import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createOAuthState, verifyOAuthState } from './oauth-state';

const USER_ID = '11111111-1111-1111-1111-111111111111';

beforeAll(() => {
  vi.stubEnv('MP_CLIENT_SECRET', 'test-secret');
});

describe('OAuth state', () => {
  it('returns the user id when cookie and state match', () => {
    const { nonce, cookieValue } = createOAuthState(USER_ID);
    expect(verifyOAuthState(cookieValue, nonce)).toBe(USER_ID);
  });

  it('generates a different nonce on every call', () => {
    expect(createOAuthState(USER_ID).nonce).not.toBe(createOAuthState(USER_ID).nonce);
  });

  it('rejects a state that does not match the cookie', () => {
    const { cookieValue } = createOAuthState(USER_ID);
    const { nonce: otherNonce } = createOAuthState(USER_ID);
    expect(verifyOAuthState(cookieValue, otherNonce)).toBeNull();
  });

  it('rejects a cookie whose user id was swapped', () => {
    const { nonce, cookieValue } = createOAuthState(USER_ID);
    const [, cookieNonce, signature] = cookieValue.split('.');
    const forged = `22222222-2222-2222-2222-222222222222.${cookieNonce}.${signature}`;
    expect(verifyOAuthState(forged, nonce)).toBeNull();
  });

  it('rejects a cookie signed with another secret', () => {
    const { nonce, cookieValue } = createOAuthState(USER_ID);
    vi.stubEnv('MP_CLIENT_SECRET', 'other-secret');
    expect(verifyOAuthState(cookieValue, nonce)).toBeNull();
    vi.stubEnv('MP_CLIENT_SECRET', 'test-secret');
  });

  it('rejects missing or malformed input', () => {
    const { nonce, cookieValue } = createOAuthState(USER_ID);
    expect(verifyOAuthState(undefined, nonce)).toBeNull();
    expect(verifyOAuthState(cookieValue, null)).toBeNull();
    expect(verifyOAuthState('not-a-valid-cookie', nonce)).toBeNull();
  });
});
