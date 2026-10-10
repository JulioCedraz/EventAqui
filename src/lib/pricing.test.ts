import { describe, expect, it } from 'vitest';
import { applyDiscount, getCouponError } from './pricing';
import type { Database } from '@/types/database.types';

type Coupon = Database['public']['Tables']['coupons']['Row'];

const EVENT_ID = 'event-1';

const coupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  id: 'coupon-1',
  code: 'PROMO',
  event_id: EVENT_ID,
  producer_id: 'producer-1',
  discount_type: 'percentage',
  discount_value: 10,
  max_uses: null,
  used_count: 0,
  expires_at: null,
  created_at: null,
  is_casadinha_only: false,
  ...overrides,
});

describe('applyDiscount', () => {
  it('returns the base amount without a coupon', () => {
    expect(applyDiscount(50, null)).toBe(50);
  });

  it('applies a percentage discount', () => {
    expect(applyDiscount(50, { discount_type: 'percentage', discount_value: 20 })).toBe(40);
  });

  it('applies a fixed discount', () => {
    expect(applyDiscount(50, { discount_type: 'fixed', discount_value: 15 })).toBe(35);
  });

  it('never goes below zero', () => {
    expect(applyDiscount(10, { discount_type: 'fixed', discount_value: 25 })).toBe(0);
    expect(applyDiscount(10, { discount_type: 'percentage', discount_value: 100 })).toBe(0);
  });

  it('rounds to cents', () => {
    expect(applyDiscount(10, { discount_type: 'percentage', discount_value: 33 })).toBe(6.7);
    expect(applyDiscount(0.1 + 0.2, null)).toBe(0.3);
  });
});

describe('getCouponError', () => {
  it('accepts a valid coupon for the event', () => {
    expect(getCouponError(coupon(), EVENT_ID, 1)).toBeNull();
  });

  it('rejects a coupon from another event', () => {
    expect(getCouponError(coupon({ event_id: 'event-2' }), EVENT_ID, 1)).toMatch(/não é válido para este evento/);
  });

  it('requires two tickets for casadinha-only coupons', () => {
    const casadinha = coupon({ is_casadinha_only: true });
    expect(getCouponError(casadinha, EVENT_ID, 1)).toMatch(/Casadinha/);
    expect(getCouponError(casadinha, EVENT_ID, 2)).toBeNull();
  });

  it('rejects an expired coupon', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(getCouponError(coupon({ expires_at: yesterday }), EVENT_ID, 1)).toMatch(/expirou/);
    expect(getCouponError(coupon({ expires_at: tomorrow }), EVENT_ID, 1)).toBeNull();
  });

  it('rejects a coupon that reached its usage limit', () => {
    expect(getCouponError(coupon({ max_uses: 5, used_count: 5 }), EVENT_ID, 1)).toMatch(/limite/);
    expect(getCouponError(coupon({ max_uses: 5, used_count: 4 }), EVENT_ID, 1)).toBeNull();
  });

  it('treats a missing usage count as zero', () => {
    expect(getCouponError(coupon({ max_uses: 1, used_count: null }), EVENT_ID, 1)).toBeNull();
  });
});
