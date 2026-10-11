import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { getRequestUser } from '@/lib/auth';
import { DELETE, PATCH } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn() }));

const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const BUYER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const ticket = (overrides = {}) => ({ id: TICKET_ID, user_id: BUYER.id, payment_status: 'pending', ...overrides });

const context = (id = TICKET_ID) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown = { action: 'cancel' }, id = TICKET_ID) =>
  PATCH(new Request(`http://localhost/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), context(id));
const remove = (id = TICKET_ID) =>
  DELETE(new Request(`http://localhost/api/tickets/${id}`, { method: 'DELETE' }), context(id));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(BUYER as never);

  fakeDb.on('tickets', 'select', { data: ticket() });
  fakeDb.on('tickets', 'update', { data: { id: TICKET_ID } });
  fakeDb.on('tickets', 'delete', { data: { id: TICKET_ID } });
});

describe('PATCH /api/tickets/[id]', () => {
  it('cancels a pending ticket of the buyer', async () => {
    const res = await patch();

    expect(res.status).toBe(200);
    const [update] = fakeDb.find('tickets', 'update');
    expect(update.payload).toEqual({ payment_status: 'cancelled' });
    expect(eqValue(update, 'payment_status')).toBe('pending');
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await patch()).status).toBe(401);
  });

  it('rejects an unknown action', async () => {
    expect((await patch({ action: 'approve' })).status).toBe(400);
    expect(fakeDb.find('tickets', 'update')).toHaveLength(0);
  });

  it('hides a ticket owned by another user', async () => {
    fakeDb.on('tickets', 'select', { data: ticket({ user_id: 'someone-else' }) });

    expect((await patch()).status).toBe(404);
    expect(fakeDb.find('tickets', 'update')).toHaveLength(0);
  });

  it('returns 404 for an invalid id', async () => {
    expect((await patch({ action: 'cancel' }, 'not-a-uuid')).status).toBe(404);
  });

  it('refuses to cancel an approved ticket', async () => {
    fakeDb.on('tickets', 'select', { data: ticket({ payment_status: 'approved' }) });

    expect((await patch()).status).toBe(409);
    expect(fakeDb.find('tickets', 'update')).toHaveLength(0);
  });

  it('refuses when the ticket is approved between the read and the update', async () => {
    fakeDb.on('tickets', 'update', { data: null });
    expect((await patch()).status).toBe(409);
  });
});

describe('DELETE /api/tickets/[id]', () => {
  beforeEach(() => {
    fakeDb.on('tickets', 'select', { data: ticket({ payment_status: 'cancelled' }) });
  });

  it('deletes a cancelled ticket of the buyer', async () => {
    const res = await remove();

    expect(res.status).toBe(200);
    expect(eqValue(fakeDb.find('tickets', 'delete')[0], 'payment_status')).toBe('cancelled');
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await remove()).status).toBe(401);
  });

  it('hides a ticket owned by another user', async () => {
    fakeDb.on('tickets', 'select', { data: ticket({ user_id: 'someone-else', payment_status: 'cancelled' }) });

    expect((await remove()).status).toBe(404);
    expect(fakeDb.find('tickets', 'delete')).toHaveLength(0);
  });

  it('refuses to delete a ticket that is not cancelled', async () => {
    fakeDb.on('tickets', 'select', { data: ticket({ payment_status: 'approved' }) });

    expect((await remove()).status).toBe(409);
    expect(fakeDb.find('tickets', 'delete')).toHaveLength(0);
  });
});
