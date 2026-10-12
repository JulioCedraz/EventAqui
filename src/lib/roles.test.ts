import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eqValue, fakeDb } from '@/test/fake-supabase';
import { fetchOwnRole } from './roles';

vi.mock('./supabase', async () => ({ supabase: (await import('@/test/fake-supabase')).fakeDb.client }));

const USER_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  fakeDb.reset();
});

describe('fetchOwnRole', () => {
  it('reads the role from the user profile', async () => {
    fakeDb.on('profiles', 'select', { data: { role: 'producer' } });

    expect(await fetchOwnRole(USER_ID)).toBe('producer');
    expect(eqValue(fakeDb.find('profiles', 'select')[0], 'id')).toBe(USER_ID);
  });

  it('treats a missing profile as customer', async () => {
    expect(await fetchOwnRole(USER_ID)).toBe('customer');
  });

  it('treats an unknown role as customer', async () => {
    fakeDb.on('profiles', 'select', { data: { role: 'superuser' } });
    expect(await fetchOwnRole(USER_ID)).toBe('customer');
  });
});
