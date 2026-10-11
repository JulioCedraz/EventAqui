import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { POST } from './route';

const { updateUserById, inviteUserByEmail } = vi.hoisted(() => ({
  updateUserById: vi.fn(),
  inviteUserByEmail: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', async () => ({
  supabaseAdmin: { ...(await import('@/test/fake-supabase')).fakeDb.client, auth: { admin: { updateUserById, inviteUserByEmail } } },
}));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), getUserRole: vi.fn() }));

const PRODUCER = { id: '11111111-1111-4111-8111-111111111111', email: 'prod@x.com' };
const USER_ID = '22222222-2222-4222-8222-222222222222';

const invite = (body: unknown = { email: 'Agent@x.com', role: 'agent' }) =>
  POST(new Request('http://localhost/api/invite', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(PRODUCER as never);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'producer', isAdmin: false });
  updateUserById.mockResolvedValue({ error: null });
  inviteUserByEmail.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

  fakeDb.on('profiles', 'select', { data: null });
});

describe('POST /api/invite', () => {
  it('invites a new agent and stores the role in profiles and app_metadata', async () => {
    const res = await invite();

    expect(res.status).toBe(200);
    expect(inviteUserByEmail).toHaveBeenCalledWith('agent@x.com', expect.anything());
    const [update] = fakeDb.find('profiles', 'update');
    expect(update.payload).toEqual({ role: 'agent', producer_id: PRODUCER.id });
    expect(eqValue(update, 'id')).toBe(USER_ID);
    expect(updateUserById).toHaveBeenCalledWith(USER_ID, { app_metadata: { role: 'agent', producer_id: PRODUCER.id } });
  });

  it('promotes an existing customer without sending an invite', async () => {
    fakeDb.on('profiles', 'select', { data: { id: USER_ID, role: 'customer' } });

    const res = await invite();

    expect(res.status).toBe(200);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledWith(USER_ID, { app_metadata: { role: 'agent', producer_id: PRODUCER.id } });
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await invite()).status).toBe(401);
  });

  it('does not let a producer invite a producer', async () => {
    expect((await invite({ email: 'p@x.com', role: 'producer' })).status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('does not let a producer recruit a user with an administrative role', async () => {
    fakeDb.on('profiles', 'select', { data: { id: USER_ID, role: 'producer' } });

    expect((await invite()).status).toBe(403);
    expect(fakeDb.find('profiles', 'update')).toHaveLength(0);
  });

  it('fails when app_metadata cannot be updated', async () => {
    updateUserById.mockResolvedValue({ error: new Error('auth down') });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect((await invite()).status).toBe(500);
  });
});
