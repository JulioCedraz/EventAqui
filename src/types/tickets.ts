import type { Tables } from './database.types';

export type CouponSummary = Pick<Tables<'coupons'>, 'code' | 'discount_type' | 'discount_value'>;

export type TicketWithEvent = Tables<'tickets'> & {
  events: Tables<'events'> | null;
  coupons: CouponSummary | null;
};
