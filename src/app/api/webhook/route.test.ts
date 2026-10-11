import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { sendTicketApprovedEmail } from '@/lib/mail';
import { POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/mail', () => ({
  sendTicketApprovedEmail: vi.fn().mockResolvedValue({}),
  sendGuestInviteEmail: vi.fn().mockResolvedValue({}),
}));

const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const PRODUCER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_PRODUCER_ID = '66666666-6666-4666-8666-666666666666';

const fetchMock = vi.fn();

const notify = (body: unknown = { type: 'payment', data: { id: '987' } }, producerId: string = PRODUCER_ID) =>
  POST(new Request(`http://localhost/api/webhook?producerId=${producerId}`, { method: 'POST', body: JSON.stringify(body) }));

const mpPayment = (overrides = {}) => ({
  status: 'approved',
  external_reference: TICKET_ID,
  point_of_interaction: { transaction_data: { qr_code: 'PIX-QR' } },
  ...overrides,
});

const approvals = () => fakeDb.find('tickets', 'update');

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);

  fakeDb.on('profiles', 'select', { data: { mp_access_token: 'producer-token' } });
  fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, pix_qr_code: 'PIX-QR', events: { producer_id: PRODUCER_ID } } });
  fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: null, buyer_email: 'alice@x.com', events: { title: 'Calourada' } } });

  fetchMock.mockImplementation(async () => new Response(JSON.stringify(mpPayment())));
});

describe('POST /api/webhook', () => {
  it('approves the ticket when the paid PIX is the one generated for it', async () => {
    const res = await notify();

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mercadopago.com/v1/payments/987');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer producer-token');
    expect(approvals()).toHaveLength(1);
    expect(approvals()[0].payload).toEqual({ payment_status: 'approved' });
    expect(sendTicketApprovedEmail).toHaveBeenCalledWith('alice@x.com', 'Calourada', TICKET_ID);
  });

  it('ignores notifications that are not about payments', async () => {
    const res = await notify({ type: 'merchant_order', data: { id: '1' } });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects notifications without a valid producer', async () => {
    expect((await notify(undefined, 'not-a-uuid')).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not approve payments that are still pending', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(mpPayment({ status: 'pending' }))));
    await notify();
    expect(approvals()).toHaveLength(0);
  });

  it('does not approve a payment with a different PIX code', async () => {
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify(mpPayment({ point_of_interaction: { transaction_data: { qr_code: 'ATTACKER-PIX' } } }))));

    const res = await notify();
    expect(res.status).toBe(200);
    expect(approvals()).toHaveLength(0);
  });

  it('does not approve a ticket of another producer event', async () => {
    fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, pix_qr_code: 'PIX-QR', events: { producer_id: OTHER_PRODUCER_ID } } });
    await notify();
    expect(approvals()).toHaveLength(0);
  });

  it('does not resend emails when the ticket was already approved', async () => {
    fakeDb.on('tickets', 'update', { data: null });

    const res = await notify();
    expect(res.status).toBe(200);
    expect(sendTicketApprovedEmail).not.toHaveBeenCalled();
  });

  it('counts coupon usage atomically on approval', async () => {
    fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: 'c1', buyer_email: 'alice@x.com', events: { title: 'Calourada' } } });
    await notify();
    expect(fakeDb.find('increment_coupon_usage', 'rpc')[0].payload).toEqual({ p_coupon_id: 'c1' });
  });
});
