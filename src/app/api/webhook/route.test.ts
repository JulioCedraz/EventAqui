import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { sendTicketApprovedEmail } from '@/lib/mail';
import { POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/secret-box', () => ({ decryptSecret: (value: string) => value.replace('sealed:', '') }));
vi.mock('@/lib/mail', () => ({
  sendTicketApprovedEmail: vi.fn().mockResolvedValue({}),
  sendGuestInviteEmail: vi.fn().mockResolvedValue({}),
}));

const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const PRODUCER_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';

const fetchMock = vi.fn();

const notification = (overrides = {}) => ({
  invoice_slug: 'abc123',
  amount: 5000,
  paid_amount: 5300,
  installments: 3,
  capture_method: 'credit_card',
  transaction_nsu: 'tx-1',
  order_nsu: TICKET_ID,
  receipt_url: 'https://recibo.infinitepay.io/abc123',
  ...overrides,
});

const notify = (body: unknown = notification()) =>
  POST(new Request('http://localhost/api/webhook', { method: 'POST', body: JSON.stringify(body) }));

const paymentCheck = (overrides = {}) =>
  new Response(JSON.stringify({ success: true, paid: true, amount: 5000, paid_amount: 5300, installments: 3, capture_method: 'credit_card', ...overrides }));

const statusUpdates = () =>
  fakeDb.find('tickets', 'update').filter((q) => 'payment_status' in (q.payload as object));
const bindUpdate = () =>
  fakeDb.find('tickets', 'update').find((q) => 'transaction_nsu' in (q.payload as object))?.payload as Record<string, unknown> | undefined;

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);

  fakeDb.on('profiles', 'select', { data: { infinitepay_handle: 'produtora', infinitepay_api_key_enc: 'sealed:inchk_producer' } });
  fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, amount_cents: 5000, transaction_nsu: null, events: { producer_id: PRODUCER_ID } } });
  fakeDb.on('tickets', 'select', { data: { payment_status: 'pending', expires_at: null, quantity: 1, event_id: EVENT_ID, events: { total_spots: null } } },
    (q) => !!q.columns?.includes('total_spots'));
  fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: null, buyer_email: 'alice@x.com', events: { title: 'Calourada' } } });

  fetchMock.mockImplementation(async () => paymentCheck());
});

describe('POST /api/webhook', () => {
  it('approves the ticket after confirming the payment with the producer key', async () => {
    const res = await notify();

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.checkout.infinitepay.io/payment_check');
    expect(fetchMock.mock.calls[0][1].headers['X-Api-Key']).toBe('inchk_producer');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      handle: 'produtora', order_nsu: TICKET_ID, transaction_nsu: 'tx-1', slug: 'abc123',
    });
    expect(statusUpdates()[0].payload).toEqual({ payment_status: 'approved' });
    expect(sendTicketApprovedEmail).toHaveBeenCalledWith('alice@x.com', 'Calourada', TICKET_ID);
  });

  it('stores the transaction, method and amount paid with card interest', async () => {
    await notify();

    expect(bindUpdate()).toEqual({
      transaction_nsu: 'tx-1',
      invoice_slug: 'abc123',
      payment_method: 'credit_card',
      paid_amount_cents: 5300,
      installments: 3,
      receipt_url: 'https://recibo.infinitepay.io/abc123',
    });
  });

  it('drops receipt links outside InfinitePay', async () => {
    await notify(notification({ receipt_url: 'https://phishing.example/recibo' }));
    expect(bindUpdate()?.receipt_url).toBeNull();
  });

  it('ignores malformed notifications without calling the gateway', async () => {
    const res = await notify({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores an order reference that is not a ticket id', async () => {
    await notify(notification({ order_nsu: 'pedido-123' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusUpdates()).toHaveLength(0);
  });

  it('does not approve an unpaid payment', async () => {
    fetchMock.mockImplementation(async () => paymentCheck({ paid: false }));
    await notify();
    expect(statusUpdates()).toHaveLength(0);
  });

  it('does not approve when the paid amount differs from the order', async () => {
    fetchMock.mockImplementation(async () => paymentCheck({ amount: 1 }));

    const res = await notify();
    expect(res.status).toBe(200);
    expect(bindUpdate()).toBeUndefined();
    expect(statusUpdates()).toHaveLength(0);
  });

  it('does not approve a second transaction on the same order', async () => {
    fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, amount_cents: 5000, transaction_nsu: 'tx-0', events: { producer_id: PRODUCER_ID } } },
      (q) => !!q.columns?.includes('transaction_nsu'));

    await notify();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusUpdates()).toHaveLength(0);
  });

  it('does not approve when the transaction is already bound to another order', async () => {
    fakeDb.on('tickets', 'update', { error: { code: '23505' } }, (q) => 'transaction_nsu' in (q.payload as object));

    await notify();
    expect(statusUpdates()).toHaveLength(0);
  });

  it('asks for a retry when the gateway is unavailable', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 503 }));

    const res = await notify();
    expect(res.status).toBe(400);
    expect(statusUpdates()).toHaveLength(0);
  });

  it('asks for a retry when the producer has no usable key', async () => {
    fakeDb.on('profiles', 'select', { data: { infinitepay_handle: 'produtora', infinitepay_api_key_enc: null } });

    const res = await notify();
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not resend emails when the ticket was already approved', async () => {
    fakeDb.on('tickets', 'update', { data: null }, (q) => 'payment_status' in (q.payload as object));

    const res = await notify();
    expect(res.status).toBe(200);
    expect(sendTicketApprovedEmail).not.toHaveBeenCalled();
  });

  it('counts coupon usage atomically on approval', async () => {
    fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: 'c1', buyer_email: 'alice@x.com', events: { title: 'Calourada' } } },
      (q) => 'payment_status' in (q.payload as object));
    await notify();
    expect(fakeDb.find('increment_coupon_usage', 'rpc')[0].payload).toEqual({ p_coupon_id: 'c1' });
  });
});
