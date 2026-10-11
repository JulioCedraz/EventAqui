import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmationRedirectUrl, formatBRL, getErrorMessage, safeNextPath } from './utils';

describe('safeNextPath', () => {
  it('accepts internal paths', () => {
    expect(safeNextPath('/tickets')).toBe('/tickets');
    expect(safeNextPath('/resgatar/abc?x=1')).toBe('/resgatar/abc?x=1');
  });

  it('blocks external and protocol-relative destinations', () => {
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('')).toBeNull();
  });
});

describe('confirmationRedirectUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const withOrigin = (origin: string) => vi.stubGlobal('window', { location: { origin } });

  it('sends regular signups to login with the confirmation marker', () => {
    withOrigin('https://eventaqui.app');
    expect(confirmationRedirectUrl(null)).toBe('https://eventaqui.app/login?confirmado=1');
  });

  it('keeps the next path after login', () => {
    withOrigin('https://eventaqui.app');
    expect(confirmationRedirectUrl('/evento/123')).toBe('https://eventaqui.app/login?confirmado=1&next=%2Fevento%2F123');
  });

  it('returns guests straight to the redeem page', () => {
    withOrigin('https://eventaqui.app');
    expect(confirmationRedirectUrl('/resgatar/abc')).toBe('https://eventaqui.app/resgatar/abc');
  });
});

describe('getErrorMessage', () => {
  it('reads the message of Error instances and Supabase error objects', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' }, 'fallback')).toBe('duplicate key');
  });

  it('falls back when there is no usable message', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage('text', 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ code: 'x' }, 'fallback')).toBe('fallback');
  });
});

describe('formatBRL', () => {
  it('formats with two decimals and a comma', () => {
    expect(formatBRL(50)).toBe('R$ 50,00');
    expect(formatBRL(12.5)).toBe('R$ 12,50');
    expect(formatBRL(0)).toBe('R$ 0,00');
  });
});
