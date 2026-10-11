import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { GET, POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), getUserRole: vi.fn() }));

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const check = () => GET(new Request('http://localhost/api/user/deletion-request'));
const request = (body: unknown = {}) =>
  POST(new Request('http://localhost/api/user/deletion-request', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'customer', isAdmin: false });

  fakeDb.on('events', 'select', { data: [] });
  fakeDb.on('tickets', 'select', { data: [] });
  fakeDb.on('guests', 'select', { data: [] });
});

describe('GET /api/user/deletion-request', () => {
  it('reports future tickets and the guests registered on them', async () => {
    fakeDb.on('tickets', 'select', { data: [{ id: 't1' }, { id: 't2' }] });
    fakeDb.on('guests', 'select', { data: [{ id: 'g1' }] });

    const res = await check();

    expect(await res.json()).toEqual({ producerBlocked: false, futureTickets: 2, guests: 1 });
    const [ticketsQuery] = fakeDb.find('tickets', 'select');
    expect(eqValue(ticketsQuery, 'user_id')).toBe(USER.id);
    expect(ticketsQuery.filters).toContainEqual({ method: 'in', args: ['payment_status', ['approved', 'pending']] });
    const [guestsQuery] = fakeDb.find('guests', 'select');
    expect(guestsQuery.filters).toContainEqual({ method: 'in', args: ['ticket_id', ['t1', 't2']] });
  });

  it('flags a producer with future events', async () => {
    vi.mocked(getUserRole).mockResolvedValue({ role: 'producer', isAdmin: false });
    fakeDb.on('events', 'select', { data: [{ id: 'e1' }] });

    expect(await (await check()).json()).toEqual({ producerBlocked: true, futureTickets: 0, guests: 0 });
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await check()).status).toBe(401);
  });
});

describe('POST /api/user/deletion-request', () => {
  it('schedules the deletion of an account without future tickets', async () => {
    const res = await request();

    expect(res.status).toBe(200);
    const [update] = fakeDb.find('profiles', 'update');
    expect(update.payload).toMatchObject({ status: 'pending_deletion' });
    expect(eqValue(update, 'id')).toBe(USER.id);
  });

  it('requires confirmation to abandon future tickets', async () => {
    fakeDb.on('tickets', 'select', { data: [{ id: 't1' }] });

    const res = await request();

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('CUSTOMER_HAS_TICKETS');
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('schedules the deletion when the user abandons future tickets', async () => {
    fakeDb.on('tickets', 'select', { data: [{ id: 't1' }] });

    expect((await request({ confirmTicketAbandonment: true })).status).toBe(200);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(1);
  });

  it('blocks a producer with future events even with confirmation', async () => {
    vi.mocked(getUserRole).mockResolvedValue({ role: 'producer', isAdmin: false });
    fakeDb.on('events', 'select', { data: [{ id: 'e1' }] });

    const res = await request({ confirmTicketAbandonment: true });

    expect(res.status).toBe(403);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('rejects an invalid body', async () => {
    expect((await request({ confirmTicketAbandonment: 'yes' })).status).toBe(400);
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await request()).status).toBe(401);
  });
});
