import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { GET, PUT } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn(), getUserRole: vi.fn() }));
vi.mock('@/lib/secret-box', () => ({
  encryptSecret: (value: string) => `sealed:${value}`,
  decryptSecret: (value: string) => value.replace('sealed:', ''),
}));

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'produtora@x.com' };

const request = (method: string, body?: unknown) =>
  new Request('http://localhost/api/producer/payment-settings', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const savedProfile = () => fakeDb.find('profiles', 'update')[0]?.payload as Record<string, unknown> | undefined;

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'producer', isAdmin: false });

  fakeDb.on('profiles', 'select', { data: { infinitepay_handle: 'produtora', infinitepay_api_key_enc: 'sealed:inchk_abcd1234' } });
});

describe('/api/producer/payment-settings', () => {
  it('requires an authenticated producer', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await GET(request('GET'))).status).toBe(401);

    vi.mocked(getRequestUser).mockResolvedValue(USER as never);
    vi.mocked(getUserRole).mockResolvedValue({ role: 'customer', isAdmin: false });
    expect((await PUT(request('PUT', { handle: 'x1', apiKey: 'inchk_1234567890' }))).status).toBe(403);
    expect(savedProfile()).toBeUndefined();
  });

  it('never returns the API key, only its last characters', async () => {
    const body = await (await GET(request('GET'))).json();
    expect(body).toEqual({ handle: 'produtora', keyHint: '1234' });
  });

  it('stores the key encrypted on the caller profile', async () => {
    const res = await PUT(request('PUT', { handle: '$Produtora', apiKey: ' inchk_newkey9876 ' }));

    expect(res.status).toBe(200);
    expect(savedProfile()).toEqual({ infinitepay_handle: 'produtora', infinitepay_api_key_enc: 'sealed:inchk_newkey9876' });
    expect(fakeDb.find('profiles', 'update')[0].filters).toContainEqual({ method: 'eq', args: ['id', USER.id] });
    expect(await res.json()).toEqual({ handle: 'produtora', keyHint: '9876' });
  });

  it('rejects an invalid InfiniteTag', async () => {
    const res = await PUT(request('PUT', { handle: 'tag com espaço', apiKey: 'inchk_1234567890' }));
    expect(res.status).toBe(400);
    expect(savedProfile()).toBeUndefined();
  });
});
