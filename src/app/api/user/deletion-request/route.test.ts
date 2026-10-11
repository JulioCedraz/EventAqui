import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { sendAccountDeletionScheduledEmail } from '@/lib/mail';
import { hashDeletionCode } from '@/lib/deletion-code';
import { GET, POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), getUserRole: vi.fn() }));
vi.mock('@/lib/mail', () => ({ sendAccountDeletionScheduledEmail: vi.fn() }));

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const check = () => GET(new Request('http://localhost/api/user/deletion-request'));
const CODE = '123456';
const storedCode = (overrides = {}) => ({
  code_hash: hashDeletionCode(USER.id, CODE),
  attempts: 0,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
});

const request = (body: Record<string, unknown> = {}) =>
  POST(new Request('http://localhost/api/user/deletion-request', { method: 'POST', body: JSON.stringify({ code: CODE, ...body }) }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'customer', isAdmin: false });

  fakeDb.on('events', 'select', { data: [] });
  fakeDb.on('tickets', 'select', { data: [] });
  fakeDb.on('guests', 'select', { data: [] });
  fakeDb.on('account_deletion_codes', 'select', { data: storedCode() });
  vi.mocked(sendAccountDeletionScheduledEmail).mockResolvedValue({} as never);
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
  it('schedules the deletion, consumes the code and warns the owner by e-mail', async () => {
    const res = await request();

    expect(res.status).toBe(200);
    const [update] = fakeDb.find('profiles', 'update');
    expect(update.payload).toMatchObject({ status: 'pending_deletion' });
    expect(eqValue(update, 'id')).toBe(USER.id);
    expect(fakeDb.find('account_deletion_codes', 'delete')).toHaveLength(1);
    expect(sendAccountDeletionScheduledEmail).toHaveBeenCalledWith(USER.email, expect.any(Date));
  });

  it('still schedules the deletion when the warning e-mail fails', async () => {
    vi.mocked(sendAccountDeletionScheduledEmail).mockRejectedValue(new Error('smtp down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect((await request()).status).toBe(200);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const res = await request({ code: '654321' });

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_CODE');
    const [attempt] = fakeDb.find('account_deletion_codes', 'update');
    expect(attempt.payload).toEqual({ attempts: 1 });
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('rejects an expired code', async () => {
    fakeDb.on('account_deletion_codes', 'select', { data: storedCode({ expires_at: new Date(Date.now() - 1000).toISOString() }) });

    expect((await request()).status).toBe(400);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('rejects the right code after too many attempts', async () => {
    fakeDb.on('account_deletion_codes', 'select', { data: storedCode({ attempts: 5 }) });

    expect((await request()).status).toBe(400);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('rejects when no code was requested', async () => {
    fakeDb.on('account_deletion_codes', 'select', { data: null });

    expect((await request()).status).toBe(400);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('keeps the code when the user still has to confirm the tickets', async () => {
    fakeDb.on('tickets', 'select', { data: [{ id: 't1' }] });

    expect((await request()).status).toBe(400);
    expect(fakeDb.find('account_deletion_codes', 'delete')).toHaveLength(0);
    expect(fakeDb.find('account_deletion_codes', 'update')).toHaveLength(0);
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
    expect((await request({ code: '12345' })).status).toBe(400);
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await request()).status).toBe(401);
  });
});
