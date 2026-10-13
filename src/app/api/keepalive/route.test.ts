import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { GET } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));

const ping = (authorization?: string) =>
  GET(new Request('http://localhost/api/keepalive', { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  fakeDb.reset();
  vi.unstubAllEnvs();
  vi.stubEnv('CRON_SECRET', 'cron-secret');
  fakeDb.on('events', 'select', { data: [{ id: 'e1' }] });
});

describe('GET /api/keepalive', () => {
  it('queries the database when called with the cron secret', async () => {
    const res = await ping('Bearer cron-secret');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fakeDb.find('events', 'select')).toHaveLength(1);
  });

  it('rejects calls without the secret or with a wrong one', async () => {
    expect((await ping()).status).toBe(401);
    expect((await ping('Bearer wrong-secret')).status).toBe(401);
    expect(fakeDb.find('events', 'select')).toHaveLength(0);
  });

  it('rejects every call when the secret is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await ping('Bearer ')).status).toBe(401);
  });

  it('reports a failed query without exposing the error', async () => {
    fakeDb.on('events', 'select', { error: { message: 'connection refused' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await ping('Bearer cron-secret');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
