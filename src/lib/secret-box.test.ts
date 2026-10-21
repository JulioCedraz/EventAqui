import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptSecret, encryptSecret } from './secret-box';

const KEY = Buffer.alloc(32, 7).toString('base64');

beforeEach(() => {
  vi.stubEnv('PAYMENT_KEY_SECRET', KEY);
});

describe('secret box', () => {
  it('round-trips a secret without storing it in clear text', () => {
    const sealed = encryptSecret('inchk_secret');
    expect(sealed).not.toContain('inchk_secret');
    expect(decryptSecret(sealed)).toBe('inchk_secret');
  });

  it('uses a fresh IV on every call', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('rejects tampered ciphertext', () => {
    const [version, iv, tag, ciphertext] = encryptSecret('inchk_secret').split('.');
    const flipped = Buffer.from(ciphertext, 'base64url');
    flipped[0] ^= 1;
    expect(decryptSecret([version, iv, tag, flipped.toString('base64url')].join('.'))).toBeNull();
  });

  it('rejects values sealed with another key', () => {
    const sealed = encryptSecret('inchk_secret');
    vi.stubEnv('PAYMENT_KEY_SECRET', Buffer.alloc(32, 9).toString('base64'));
    expect(decryptSecret(sealed)).toBeNull();
  });

  it('fails closed when the key is missing', () => {
    vi.stubEnv('PAYMENT_KEY_SECRET', '');
    expect(() => encryptSecret('inchk_secret')).toThrow();
  });
});
