import { describe, expect, it } from 'vitest';
import { deletionCodeMatches, generateDeletionCode, hashDeletionCode } from './deletion-code';

const USER = '11111111-1111-4111-8111-111111111111';

describe('generateDeletionCode', () => {
  it('returns six digits, keeping leading zeros', () => {
    for (let i = 0; i < 50; i++) expect(generateDeletionCode()).toMatch(/^\d{6}$/);
  });
});

describe('deletionCodeMatches', () => {
  it('accepts the code that produced the hash', () => {
    expect(deletionCodeMatches(USER, '012345', hashDeletionCode(USER, '012345'))).toBe(true);
  });

  it('rejects a different code', () => {
    expect(deletionCodeMatches(USER, '012346', hashDeletionCode(USER, '012345'))).toBe(false);
  });

  it('rejects the right code for another user', () => {
    const other = '22222222-2222-4222-8222-222222222222';
    expect(deletionCodeMatches(other, '012345', hashDeletionCode(USER, '012345'))).toBe(false);
  });

  it('rejects a malformed stored hash', () => {
    expect(deletionCodeMatches(USER, '012345', 'abc')).toBe(false);
  });
});
