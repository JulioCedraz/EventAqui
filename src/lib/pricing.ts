import type { Database } from '@/types/database.types';

type Coupon = Database['public']['Tables']['coupons']['Row'];
type Discount = Pick<Coupon, 'discount_type' | 'discount_value'>;

const roundCents = (value: number) => Math.round(value * 100) / 100;

// Fonte única do cálculo de preço, usada pela vitrine e pelo servidor.
export function applyDiscount(baseAmount: number, coupon: Discount | null): number {
  if (!coupon) return roundCents(baseAmount);

  const value = Number(coupon.discount_value);
  const discounted = coupon.discount_type === 'percentage'
    ? baseAmount - baseAmount * (value / 100)
    : baseAmount - value;

  return roundCents(Math.max(0, discounted));
}

// Retorna a mensagem de erro, ou null quando o cupom pode ser usado.
export function getCouponError(coupon: Coupon, eventId: string, quantity: number): string | null {
  if (coupon.event_id !== eventId) return 'Este cupom não é válido para este evento.';
  if (coupon.is_casadinha_only && quantity < 2) return 'Este cupom é válido exclusivamente para ingressos do tipo Casadinha (2x).';
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 'Este cupom já expirou.';
  if (coupon.max_uses !== null && (coupon.used_count ?? 0) >= coupon.max_uses) return 'Este cupom atingiu o limite de utilizações.';
  return null;
}
