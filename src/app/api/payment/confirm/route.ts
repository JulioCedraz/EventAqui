import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';
import { confirmPayment } from '@/lib/payment-confirmation';

// Volta do checkout: confirma o pagamento sem esperar o webhook.
const bodySchema = z.object({
  ticketId: z.uuid(),
  transactionNsu: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
  receiptUrl: z.string().max(500).optional(),
});

const fail = (erro: string, status: number) => NextResponse.json({ erro }, { status });

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return fail('Não autorizado.', 401);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Dados inválidos.', 400);

    const { ticketId, transactionNsu, slug, receiptUrl } = parsed.data;

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, user_id')
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket || ticket.user_id !== user.id) return fail('Pedido não encontrado.', 404);

    const result = await confirmPayment({ orderNsu: ticketId, transactionNsu, slug, receiptUrl });
    if (result === 'gateway_error') return fail('Não foi possível verificar o pagamento agora.', 502);

    const { data: current } = await supabaseAdmin
      .from('tickets')
      .select('payment_status')
      .eq('id', ticketId)
      .maybeSingle();

    return NextResponse.json({ status: current?.payment_status ?? 'pending' });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return fail('Erro interno no servidor.', 500);
  }
}
