import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { fakeDb } from '@/test/fake-supabase';
import { getUserRole } from './auth';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' } as User;

beforeEach(() => {
  fakeDb.reset();
  vi.unstubAllEnvs();
});

describe('getUserRole', () => {
  it('grants admin from the profile role', async () => {
    fakeDb.on('profiles', 'select', { data: { role: 'admin' } });
    expect(await getUserRole(user)).toEqual({ role: 'admin', isAdmin: true });
  });

  it('ignores the e-mail list that used to bypass the role', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_EMAILS', 'alice@x.com');
    fakeDb.on('profiles', 'select', { data: { role: 'producer' } });
    expect(await getUserRole(user)).toEqual({ role: 'producer', isAdmin: false });
  });

  it('falls back to customer without a profile', async () => {
    expect(await getUserRole(user)).toEqual({ role: 'customer', isAdmin: false });
  });
});
