import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({ action: z.literal('cancel') });

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Ingresso do próprio usuário; ingresso de outra pessoa responde como inexistente.
async function loadOwnTicket(request: Request, params: RouteContext['params']) {
  const user = await getRequestUser(request);
  if (!user) return { response: fail('Não autorizado.', 401) };

  const id = (await params).id;
  if (!z.uuid().safeParse(id).success) return { response: fail('Pedido não encontrado.', 404) };

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (!ticket || ticket.user_id !== user.id) return { response: fail('Pedido não encontrado.', 404) };
  return { ticket };
}

// Cancela pedido pendente. O link de pagamento continua válido até expirar no gateway.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Dados inválidos.', 400);

    const { ticket, response } = await loadOwnTicket(request, params);
    if (!ticket) return response;

    if (ticket.payment_status !== 'pending') return fail('Só pedidos pendentes podem ser cancelados.', 409);

    // Filtro de status repetido no update: o webhook pode aprovar o pedido entre a leitura e a escrita.
    const { data: cancelled, error } = await supabaseAdmin
      .from('tickets')
      .update({ payment_status: 'cancelled' })
      .eq('id', ticket.id)
      .eq('payment_status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!cancelled) return fail('Só pedidos pendentes podem ser cancelados.', 409);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    return fail('Erro interno ao cancelar o pedido.', 500);
  }
}

// Remove do histórico um pedido já cancelado.
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { ticket, response } = await loadOwnTicket(request, params);
    if (!ticket) return response;

    if (ticket.payment_status !== 'cancelled') return fail('Só pedidos cancelados podem ser excluídos.', 409);

    const { data: deleted, error } = await supabaseAdmin
      .from('tickets')
      .delete()
      .eq('id', ticket.id)
      .eq('payment_status', 'cancelled')
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) return fail('Só pedidos cancelados podem ser excluídos.', 409);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    return fail('Erro interno ao excluir o pedido.', 500);
  }
}
