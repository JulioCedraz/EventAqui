import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { getRequestUser } from '@/lib/auth';
import { sendTicketApprovedEmail } from '@/lib/mail';
import { POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/mail', () => ({
  sendTicketApprovedEmail: vi.fn().mockResolvedValue({}),
  sendGuestInviteEmail: vi.fn().mockResolvedValue({}),
}));

const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const PRODUCER_ID = '33333333-3333-4333-8333-333333333333';
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const fetchMock = vi.fn();

const request = (body: unknown) =>
  new Request('http://localhost/api/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });

const event = (overrides = {}) => ({
  id: EVENT_ID, title: 'Calourada', price: 50, total_spots: null, producer_id: PRODUCER_ID, ...overrides,
});

const mpPayment = { id: 987, point_of_interaction: { transaction_data: { qr_code: 'PIX-QR', qr_code_base64: 'BASE64' } } };

const mpBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);
const insertedTicket = () => fakeDb.find('tickets', 'insert')[0]?.payload as Record<string, unknown>;
const statusUpdates = () =>
  fakeDb.find('tickets', 'update').map((q) => (q.payload as Record<string, unknown>).payment_status).filter(Boolean);

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);

  fakeDb.on('events', 'select', { data: event() });
  fakeDb.on('tickets', 'select', { data: [] });
  fakeDb.on('profiles', 'select', { data: { first_name: 'Alice', last_name: 'Souza' } });
  fakeDb.on('profiles', 'select', { data: { mp_access_token: 'producer-token' } }, (q) => q.columns === 'mp_access_token');
  fakeDb.on('tickets', 'insert', { data: { id: TICKET_ID } });
  fakeDb.on('tickets', 'update', { data: { id: TICKET_ID, coupon_id: null, buyer_email: USER.email, events: { title: 'Calourada' } } });

  fetchMock.mockResolvedValue(new Response(JSON.stringify(mpPayment), { status: 201 }));
});

describe('POST /api/payment', () => {
  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid bodies', async () => {
    expect((await POST(request({ eventId: 'not-a-uuid' }))).status).toBe(400);
    expect((await POST(request({ eventId: EVENT_ID, isCasadinha: true }))).status).toBe(400);
  });

  it('charges the price stored on the server, ignoring the client', async () => {
    const res = await POST(request({ eventId: EVENT_ID, price: 0, payment_status: 'approved' }));

    expect(res.status).toBe(200);
    expect(mpBody().transaction_amount).toBe(50);
    expect(mpBody().external_reference).toBe(TICKET_ID);
    expect(insertedTicket()).toMatchObject({ payment_status: 'pending', user_id: USER.id, buyer_email: USER.email, quantity: 1 });
    expect(await res.json()).toMatchObject({ ticketId: TICKET_ID, qr_code: 'PIX-QR' });
  });

  it('uses the producer token from the database and saves the PIX on the ticket', async () => {
    await POST(request({ eventId: EVENT_ID }));

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer producer-token');
    const pixUpdate = fakeDb.find('tickets', 'update', (q) => (q.payload as Record<string, unknown>).pix_qr_code !== undefined);
    expect(pixUpdate[0].payload).toEqual({ pix_qr_code: 'PIX-QR', pix_qr_code_base64: 'BASE64' });
  });

  it('applies a valid coupon of the same event', async () => {
    fakeDb.on('coupons', 'select', {
      data: { id: 'c1', code: 'PROMO', event_id: EVENT_ID, discount_type: 'percentage', discount_value: 20, max_uses: null, used_count: 0, expires_at: null, is_casadinha_only: false },
    });

    await POST(request({ eventId: EVENT_ID, couponCode: 'promo' }));

    expect(mpBody().transaction_amount).toBe(40);
    expect(insertedTicket().coupon_id).toBe('c1');
  });

  it('rejects an unknown coupon without creating a ticket', async () => {
    const res = await POST(request({ eventId: EVENT_ID, couponCode: 'NOPE' }));
    expect(res.status).toBe(400);
    expect(fakeDb.find('tickets', 'insert')).toHaveLength(0);
  });

  it('charges two tickets and stores the guest for casadinha', async () => {
    const guest = { name: 'Bob Lima', email: 'BOB@X.COM', cpf: '123.456.789-09' };
    await POST(request({ eventId: EVENT_ID, isCasadinha: true, guest }));

    expect(mpBody().transaction_amount).toBe(100);
    expect(insertedTicket().quantity).toBe(2);
    expect(fakeDb.find('guests', 'insert')[0].payload).toMatchObject({ ticket_id: TICKET_ID, buyer_id: USER.id, guest_email: 'bob@x.com' });
  });

  it('approves free events on the server without calling Mercado Pago', async () => {
    fakeDb.on('events', 'select', { data: event({ price: 0 }) });

    const res = await POST(request({ eventId: EVENT_ID }));

    expect(await res.json()).toMatchObject({ is_free: true, status: 'approved' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusUpdates()).toEqual(['approved']);
    expect(sendTicketApprovedEmail).toHaveBeenCalledWith(USER.email, 'Calourada', TICKET_ID);
  });

  it('blocks a second active order from the same user', async () => {
    fakeDb.on('tickets', 'select', { data: [{ user_id: USER.id, quantity: 1, payment_status: 'pending', expires_at: new Date(Date.now() + 60_000).toISOString() }] });
    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(409);
  });

  it('ignores expired pending orders when counting spots', async () => {
    fakeDb.on('events', 'select', { data: event({ total_spots: 1 }) });
    fakeDb.on('tickets', 'select', { data: [{ user_id: 'other', quantity: 1, payment_status: 'pending', expires_at: new Date(Date.now() - 60_000).toISOString() }] });

    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(200);
  });

  it('refuses the order when the event is sold out', async () => {
    fakeDb.on('events', 'select', { data: event({ total_spots: 2 }) });
    fakeDb.on('tickets', 'select', { data: [{ user_id: 'other', quantity: 2, payment_status: 'approved', expires_at: null }] });

    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(409);
    expect(fakeDb.find('tickets', 'insert')).toHaveLength(0);
  });

  it('cancels the ticket when the producer has no Mercado Pago account', async () => {
    fakeDb.on('profiles', 'select', { data: { mp_access_token: null } }, (q) => q.columns === 'mp_access_token');

    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(400);
    expect(statusUpdates()).toEqual(['cancelled']);
  });

  it('cancels the ticket when Mercado Pago fails', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'bad' }), { status: 400 }));

    const res = await POST(request({ eventId: EVENT_ID }));
    expect(res.status).toBe(502);
    expect(statusUpdates()).toEqual(['cancelled']);
  });
});
