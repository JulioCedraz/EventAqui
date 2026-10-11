import type { Tables } from '@/types/database.types';
import type { TicketWithEvent } from '@/types/tickets';

export type Guest = Tables<'guests'>;

export type MyTicket = TicketWithEvent & { guests: Guest[]; isInheritedCoupon: boolean };

export type GuestEditForm = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
};
