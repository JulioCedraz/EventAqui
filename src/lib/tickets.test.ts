import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { sendManualRefundEmail, sendTicketApprovedEmail } from '@/lib/mail';
import { approveTicket } from './tickets';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/mail', () => ({
  sendTicketApprovedEmail: vi.fn().mockResolvedValue({}),
  sendGuestInviteEmail: vi.fn().mockResolvedValue({}),
  sendManualRefundEmail: vi.fn().mockResolvedValue({}),
}));

const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCER_ID = '33333333-3333-4333-8333-333333333333';
const BUYER_ID = '11111111-1111-4111-8111-111111111111';

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const currentTicket = (overrides = {}, totalSpots: number | null = null) => {
  fakeDb.on('tickets', 'select', {
    data: { payment_status: 'pending', expires_at: minutesFromNow(10), quantity: 1, event_id: EVENT_ID, user_id: BUYER_ID, events: { total_spots: totalSpots }, ...overrides },
  }, (q) => !!q.columns?.includes('total_spots'));
};

const activeTickets = (tickets: unknown[]) => {
  fakeDb.on('tickets', 'select', { data: tickets }, (q) => q.columns === 'user_id, quantity, payment_status, expires_at');
};

const hasField = (field: string) => (q: { payload?: unknown }) => !!q.payload && field in (q.payload as object);
const statusUpdates = () => fakeDb.find('tickets', 'update', hasField('payment_status'));
const refundRequests = () => fakeDb.find('tickets', 'update', hasField('refund_requested_at'));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});

  fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: null, buyer_email: 'alice@x.com', events: { title: 'Calourada' } } });
  fakeDb.on('tickets', 'update', { data: { buyer_name: 'Alice', buyer_email: 'alice@x.com', events: { title: 'Calourada', producer_id: PRODUCER_ID } } },
    hasField('refund_requested_at'));
  fakeDb.on('profiles', 'select', { data: { email: 'produtor@x.com' } });
});

describe('approveTicket', () => {
  it('approves a pending ticket paid within the deadline', async () => {
    currentTicket();

    expect(await approveTicket(TICKET_ID)).toBe(true);
    expect(statusUpdates()).toHaveLength(1);
    expect(statusUpdates()[0].payload).toEqual({ payment_status: 'approved' });
    expect(eqValue(statusUpdates()[0], 'payment_status')).toBe('pending');
    expect(sendTicketApprovedEmail).toHaveBeenCalledWith('alice@x.com', 'Calourada', TICKET_ID);
  });

  it('does not approve a cancelled ticket and asks the producer for a refund once', async () => {
    currentTicket({ payment_status: 'cancelled' });

    expect(await approveTicket(TICKET_ID)).toBe(false);
    expect(statusUpdates()).toHaveLength(0);
    expect(sendTicketApprovedEmail).not.toHaveBeenCalled();
    expect(refundRequests()[0].filters).toContainEqual({ method: 'is', args: ['refund_requested_at', null] });
    expect(sendManualRefundEmail).toHaveBeenCalledWith('produtor@x.com', expect.objectContaining({
      eventTitle: 'Calourada', ticketId: TICKET_ID, buyerName: 'Alice', buyerEmail: 'alice@x.com',
    }));
  });

  it('does not email the producer again when the refund was already requested', async () => {
    currentTicket({ payment_status: 'cancelled' });
    fakeDb.on('tickets', 'update', { data: null }, hasField('refund_requested_at'));

    await approveTicket(TICKET_ID);
    expect(sendManualRefundEmail).not.toHaveBeenCalled();
  });

  it('does not ask for a refund on tickets cancelled by account deletion', async () => {
    currentTicket({ payment_status: 'cancelled', user_id: null });

    await approveTicket(TICKET_ID);
    expect(refundRequests()).toHaveLength(0);
    expect(sendManualRefundEmail).not.toHaveBeenCalled();
  });

  it('does nothing when the ticket was already approved', async () => {
    currentTicket({ payment_status: 'approved' });

    expect(await approveTicket(TICKET_ID)).toBe(false);
    expect(statusUpdates()).toHaveLength(0);
  });

  it('approves a late payment while spots remain', async () => {
    currentTicket({ expires_at: minutesFromNow(-5) }, 2);
    activeTickets([{ user_id: 'other', quantity: 1, payment_status: 'approved', expires_at: null }]);

    expect(await approveTicket(TICKET_ID)).toBe(true);
    expect(statusUpdates()[0].payload).toEqual({ payment_status: 'approved' });
  });

  it('cancels a late payment when the event sold out meanwhile', async () => {
    currentTicket({ expires_at: minutesFromNow(-5), quantity: 2 }, 2);
    activeTickets([{ user_id: 'other', quantity: 1, payment_status: 'approved', expires_at: null }]);

    expect(await approveTicket(TICKET_ID)).toBe(false);
    expect(statusUpdates()).toHaveLength(1);
    expect(statusUpdates()[0].payload).toEqual({ payment_status: 'cancelled' });
    expect(eqValue(statusUpdates()[0], 'payment_status')).toBe('pending');
    expect(sendTicketApprovedEmail).not.toHaveBeenCalled();
    expect(sendManualRefundEmail).toHaveBeenCalledWith('produtor@x.com', expect.objectContaining({ ticketId: TICKET_ID }));
  });
});
