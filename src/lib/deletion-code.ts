import 'server-only';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const DELETION_CODE_TTL_MINUTES = 10;
export const DELETION_CODE_MAX_ATTEMPTS = 5;
export const DELETION_CODE_RESEND_SECONDS = 60;

export function generateDeletionCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// O banco guarda só o hash, amarrado ao usuário: um código vazado não serve para outra conta.
export function hashDeletionCode(userId: string, code: string) {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

export function deletionCodeMatches(userId: string, code: string, storedHash: string) {
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashDeletionCode(userId, code), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
