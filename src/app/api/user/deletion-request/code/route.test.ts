import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { getRequestUser, verifyPassword } from '@/lib/auth';
import { sendAccountDeletionCodeEmail } from '@/lib/mail';
import { deletionCodeMatches } from '@/lib/deletion-code';
import { POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), verifyPassword: vi.fn() }));
vi.mock('@/lib/mail', () => ({ sendAccountDeletionCodeEmail: vi.fn() }));

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const requestCode = (body: unknown = { password: 'secret' }) =>
  POST(new Request('http://localhost/api/user/deletion-request/code', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);
  vi.mocked(verifyPassword).mockResolvedValue(true);
  vi.mocked(sendAccountDeletionCodeEmail).mockResolvedValue({} as never);

  fakeDb.on('account_deletion_codes', 'select', { data: null });
});

describe('POST /api/user/deletion-request/code', () => {
  it('stores only the hash of the code and e-mails the code', async () => {
    const res = await requestCode();

    expect(res.status).toBe(200);
    expect(verifyPassword).toHaveBeenCalledWith(USER.email, 'secret');

    const [upsert] = fakeDb.find('account_deletion_codes', 'upsert');
    const payload = upsert.payload as { user_id: string; code_hash: string; attempts: number };
    expect(payload).toMatchObject({ user_id: USER.id, attempts: 0 });

    const [, code] = vi.mocked(sendAccountDeletionCodeEmail).mock.calls[0];
    expect(code).toMatch(/^\d{6}$/);
    expect(payload.code_hash).not.toContain(code);
    expect(deletionCodeMatches(USER.id, code, payload.code_hash)).toBe(true);
  });

  it('rejects a wrong password without sending a code', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);

    expect((await requestCode()).status).toBe(401);
    expect(fakeDb.find('account_deletion_codes', 'upsert')).toHaveLength(0);
    expect(sendAccountDeletionCodeEmail).not.toHaveBeenCalled();
  });

  it('asks to wait before sending another code', async () => {
    fakeDb.on('account_deletion_codes', 'select', { data: { created_at: new Date().toISOString() } });

    expect((await requestCode()).status).toBe(429);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('sends a new code once the wait is over', async () => {
    fakeDb.on('account_deletion_codes', 'select', { data: { created_at: new Date(Date.now() - 120_000).toISOString() } });

    expect((await requestCode()).status).toBe(200);
  });

  it('requires the password', async () => {
    expect((await requestCode({})).status).toBe(400);
  });

  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await requestCode()).status).toBe(401);
  });
});
