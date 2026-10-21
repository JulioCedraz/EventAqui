import type { Tables } from '@/types/database.types';

export type EventRow = Tables<'events'>;

export type PendingTicket = Pick<Tables<'tickets'>, 'id' | 'expires_at'>;

export type AppliedCoupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_casadinha_only?: boolean;
};

export type GuestData = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
};
