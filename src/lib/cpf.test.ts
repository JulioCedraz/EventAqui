import { describe, expect, it } from 'vitest';
import { validateCPF } from './cpf';

describe('validateCPF', () => {
  it('accepts a valid CPF with or without mask', () => {
    expect(validateCPF('123.456.789-09')).toBe(true);
    expect(validateCPF('12345678909')).toBe(true);
  });

  it('rejects wrong check digits, repeated digits and wrong length', () => {
    expect(validateCPF('123.456.789-00')).toBe(false);
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('1234567890')).toBe(false);
    expect(validateCPF('')).toBe(false);
  });
});
