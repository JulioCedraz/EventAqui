import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/test/fake-supabase';
import { getRequestUser } from '@/lib/auth';
import { confirmPayment } from '@/lib/payment-confirmation';
import { POST } from './route';

vi.mock('@/lib/supabase-admin', async () => ({ supabaseAdmin: (await import('@/test/fake-supabase')).fakeDb.client }));
vi.mock('@/lib/auth', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/payment-confirmation', () => ({ confirmPayment: vi.fn() }));

const TICKET_ID = '55555555-5555-4555-8555-555555555555';
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@x.com' };

const confirm = (body: unknown = { ticketId: TICKET_ID, transactionNsu: 'tx-1', slug: 'abc123' }) =>
  POST(new Request('http://localhost/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  fakeDb.reset();
  vi.clearAllMocks();
  vi.mocked(getRequestUser).mockResolvedValue(USER as never);
  vi.mocked(confirmPayment).mockResolvedValue('approved');

  fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, user_id: USER.id } });
  fakeDb.on('tickets', 'select', { data: { payment_status: 'approved' } }, (q) => q.columns === 'payment_status');
});

describe('POST /api/payment/confirm', () => {
  it('requires an authenticated user', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    expect((await confirm()).status).toBe(401);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it('rejects invalid bodies', async () => {
    expect((await confirm({ ticketId: 'x', transactionNsu: 'tx-1', slug: 'abc' })).status).toBe(400);
  });

  it('does not confirm the order of another user', async () => {
    fakeDb.on('tickets', 'select', { data: { id: TICKET_ID, user_id: 'someone-else' } }, (q) => q.columns === 'id, user_id');

    expect((await confirm()).status).toBe(404);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it('confirms the owned order with the references from the redirect', async () => {
    const res = await confirm({ ticketId: TICKET_ID, transactionNsu: 'tx-1', slug: 'abc123', receiptUrl: 'https://recibo.infinitepay.io/x' });

    expect(confirmPayment).toHaveBeenCalledWith({ orderNsu: TICKET_ID, transactionNsu: 'tx-1', slug: 'abc123', receiptUrl: 'https://recibo.infinitepay.io/x' });
    expect(await res.json()).toEqual({ status: 'approved' });
  });

  it('reports gateway failures', async () => {
    vi.mocked(confirmPayment).mockResolvedValue('gateway_error');
    expect((await confirm()).status).toBe(502);
  });
});
