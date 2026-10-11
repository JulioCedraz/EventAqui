import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { getRequestUser } from '@/lib/auth';
import { sendGuestClaimedEmail } from '@/lib/mail';
import { GET, POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/mail', () => ({ sendGuestClaimedEmail: vi.fn().mockResolvedValue({}) }));

const GUEST_ID = '77777777-7777-4777-8777-777777777777';
const BUYER_TICKET_ID = '55555555-5555-4555-8555-555555555555';
const NEW_TICKET_ID = '88888888-8888-4888-8888-888888888888';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const GUEST_USER = { id: '22222222-2222-4222-8222-222222222222', email: 'bob@x.com' };

const guest = (overrides = {}, ticketOverrides = {}) => ({
  id: GUEST_ID,
  ticket_id: BUYER_TICKET_ID,
  guest_email: 'bob@x.com',
  guest_cpf: '123.456.789-09',
  is_claimed: false,
  claimed_by_user_id: null,
  tickets: {
    buyer_name: 'Alice Souza',
    event_id: EVENT_ID,
    payment_status: 'approved',
    events: { title: 'Calourada', image_url: null, event_date: null },
    ...ticketOverrides,
  },
  ...overrides,
});

const context = { params: Promise.resolve({ id: GUEST_ID }) };
const call = (handler: typeof GET | typeof POST) =>
  handler(new Request(`http://localhost/api/guests/${GUEST_ID}`, { method: 'POST' }), context);

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(GUEST_USER as never);

  fakeDb.on('guests', 'select', { data: guest() });
  fakeDb.on('profiles', 'select', { data: { cpf: null, first_name: 'Bob', last_name: 'Lima' } });
  fakeDb.on('guests', 'update', { data: { id: GUEST_ID } });
  fakeDb.on('tickets', 'insert', { data: { id: NEW_TICKET_ID } });
});

describe('GET /api/guests/[id]', () => {
  it('returns invite data without the guest CPF and with a masked email', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const body = await (await call(GET)).json();

    expect(JSON.stringify(body)).not.toContain('123.456.789-09');
    expect(body).toMatchObject({ guestEmailHint: 'bo***@x.com', buyerName: 'Alice Souza', isPaid: true, isMismatch: false });
  });

  it('flags a logged user who is not the invited guest', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'someone', email: 'eve@x.com' } as never);
    expect((await (await call(GET)).json()).isMismatch).toBe(true);
  });

  it('returns 404 for an unknown invite', async () => {
    fakeDb.on('guests', 'select', { data: null });
    expect((await call(GET)).status).toBe(404);
  });
});

describe('POST /api/guests/[id]', () => {
  it('claims the invite: new approved ticket for the guest and buyer ticket split', async () => {
    const res = await call(POST);

    expect(res.status).toBe(200);
    expect(fakeDb.find('tickets', 'insert')[0].payload).toMatchObject({
      event_id: EVENT_ID, user_id: GUEST_USER.id, buyer_email: GUEST_USER.email, payment_status: 'approved', quantity: 1,
    });
    expect(fakeDb.find('tickets', 'update')[0].payload).toEqual({ quantity: 1 });
    expect(sendGuestClaimedEmail).toHaveBeenCalledWith(GUEST_USER.email, 'Bob', 'Calourada', NEW_TICKET_ID);
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await call(POST)).status).toBe(401);
  });

  it('refuses while the buyer ticket is not paid', async () => {
    fakeDb.on('guests', 'select', { data: guest({}, { payment_status: 'pending' }) });
    expect((await call(POST)).status).toBe(409);
    expect(fakeDb.find('tickets', 'insert')).toHaveLength(0);
  });

  it('refuses an account that does not match the invited email or CPF', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'someone', email: 'eve@x.com' } as never);
    fakeDb.on('profiles', 'select', { data: { cpf: '999.999.999-99' } });

    expect((await call(POST)).status).toBe(403);
    expect(fakeDb.find('guests', 'update')).toHaveLength(0);
  });

  it('accepts the guest identified by CPF with another email', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: GUEST_USER.id, email: 'bob.lima@outro.com' } as never);
    fakeDb.on('profiles', 'select', { data: { cpf: '12345678909', first_name: 'Bob' } });

    expect((await call(POST)).status).toBe(200);
  });

  it('refuses a second claim of the same invite', async () => {
    fakeDb.on('guests', 'update', { data: null });

    expect((await call(POST)).status).toBe(409);
    expect(fakeDb.find('tickets', 'insert')).toHaveLength(0);
  });

  it('releases the invite when the new ticket cannot be created', async () => {
    fakeDb.on('tickets', 'insert', { data: null, error: { message: 'insert failed' } });

    expect((await call(POST)).status).toBe(500);
    const updates = fakeDb.find('guests', 'update').map((q) => q.payload);
    expect(updates).toEqual([
      { is_claimed: true, claimed_by_user_id: GUEST_USER.id },
      { is_claimed: false, claimed_by_user_id: null },
    ]);
  });
});
