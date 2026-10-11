import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { POST } from './route';

const { updateUserById } = vi.hoisted(() => ({ updateUserById: vi.fn() }));

vi.mock('@/lib/supabase-admin', async () => ({
  supabaseAdmin: { ...(await import('@/test/fake-supabase')).fakeDb.client, auth: { admin: { updateUserById } } },
}));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), getUserRole: vi.fn() }));

const PRODUCER = { id: '11111111-1111-4111-8111-111111111111', email: 'prod@x.com' };
const AGENT_ID = '22222222-2222-4222-8222-222222222222';

const revoke = (body: unknown = { targetUserId: AGENT_ID }) =>
  POST(new Request('http://localhost/api/revoke', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(PRODUCER as never);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'producer', isAdmin: false });
  updateUserById.mockResolvedValue({ error: null });

  fakeDb.on('profiles', 'select', { data: { role: 'agent', producer_id: PRODUCER.id } });
});

describe('POST /api/revoke', () => {
  it('revokes an agent of the producer team in profiles and app_metadata', async () => {
    const res = await revoke();

    expect(res.status).toBe(200);
    const [update] = fakeDb.find('profiles', 'update');
    expect(update.payload).toEqual({ role: 'customer', producer_id: null });
    expect(eqValue(update, 'id')).toBe(AGENT_ID);
    expect(updateUserById).toHaveBeenCalledWith(AGENT_ID, { app_metadata: { role: 'customer', producer_id: null } });
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await revoke()).status).toBe(401);
  });

  it('rejects a customer', async () => {
    vi.mocked(getUserRole).mockResolvedValue({ role: 'customer', isAdmin: false });

    expect((await revoke()).status).toBe(403);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('rejects an agent from another producer', async () => {
    fakeDb.on('profiles', 'select', { data: { role: 'agent', producer_id: 'someone-else' } });

    expect((await revoke()).status).toBe(403);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('lets an admin revoke any user', async () => {
    vi.mocked(getUserRole).mockResolvedValue({ role: 'admin', isAdmin: true });
    fakeDb.on('profiles', 'select', { data: { role: 'producer', producer_id: null } });

    expect((await revoke()).status).toBe(200);
    expect(updateUserById).toHaveBeenCalledOnce();
  });
});
