import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, getUserRole } from '@/lib/auth';
import { sendAccountDeletionScheduledEmail } from '@/lib/mail';
import { DELETION_CODE_MAX_ATTEMPTS, deletionCodeMatches } from '@/lib/deletion-code';

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  confirmTicketAbandonment: z.boolean().default(false),
});

// Confere o código enviado por e-mail. Errar demais invalida o código.
async function checkDeletionCode(userId: string, code: string) {
  const { data: stored, error } = await supabaseAdmin
    .from('account_deletion_codes')
    .select('code_hash, attempts, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!stored || new Date(stored.expires_at) < new Date() || stored.attempts >= DELETION_CODE_MAX_ATTEMPTS) {
    return 'Código inválido ou expirado. Peça um novo código.';
  }

  if (!deletionCodeMatches(userId, code, stored.code_hash)) {
    await supabaseAdmin
      .from('account_deletion_codes')
      .update({ attempts: stored.attempts + 1 })
      .eq('user_id', userId);
    return 'Código incorreto. Verifique seu e-mail e tente novamente.';
  }

  await supabaseAdmin.from('account_deletion_codes').delete().eq('user_id', userId);
  return null;
}

const PRODUCER_BLOCKED_MESSAGE = 'Você possui eventos ativos ou futuros. Encerre seus eventos, processe os repasses/estornos e contate o administrador para encerrar sua conta.';

// O que impede ou condiciona a exclusão: eventos futuros do produtor e ingressos futuros do usuário.
async function getDeletionImpact(userId: string, role: string) {
  const todayIso = new Date().toISOString();

  if (role === 'producer') {
    const { data: activeEvents, error } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('producer_id', userId)
      .gte('event_date', todayIso)
      .limit(1);

    if (error) throw error;
    if (activeEvents?.length) return { producerBlocked: true, futureTickets: 0, guests: 0 };
  }

  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('id, events!inner(event_date)')
    .eq('user_id', userId)
    .in('payment_status', ['approved', 'pending'])
    .gte('events.event_date', todayIso);

  if (ticketsError) throw ticketsError;

  const ticketIds = (tickets ?? []).map((t) => t.id);
  if (!ticketIds.length) return { producerBlocked: false, futureTickets: 0, guests: 0 };

  const { data: guests, error: guestsError } = await supabaseAdmin
    .from('guests')
    .select('id')
    .eq('buyer_id', userId)
    .in('ticket_id', ticketIds);

  if (guestsError) throw guestsError;

  return { producerBlocked: false, futureTickets: ticketIds.length, guests: guests?.length ?? 0 };
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

    const { role } = await getUserRole(user);
    return NextResponse.json(await getDeletionImpact(user.id, role));
  } catch (error) {
    console.error('Erro ao consultar a exclusão:', error);
    return NextResponse.json({ error: 'Erro interno ao processar a solicitação.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

    const { role } = await getUserRole(user);
    const impact = await getDeletionImpact(user.id, role);

    if (impact.producerBlocked) {
      return NextResponse.json({ code: 'PRODUCER_ACTIVE_EVENTS', error: PRODUCER_BLOCKED_MESSAGE }, { status: 403 });
    }

    if (impact.futureTickets && !parsed.data.confirmTicketAbandonment) {
      return NextResponse.json({
        code: 'CUSTOMER_HAS_TICKETS',
        error: 'Você possui ingressos para eventos futuros. Confirme que abre mão deles para excluir a conta.'
      }, { status: 400 });
    }

    const codeError = await checkDeletionCode(user.id, parsed.data.code);
    if (codeError) return NextResponse.json({ code: 'INVALID_CODE', error: codeError }, { status: 400 });

    // Soft delete: a exclusão definitiva ocorre após 30 dias de carência
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'pending_deletion',
        deletion_scheduled_at: deletionDate.toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Aviso ao dono da conta: se não foi ele, ainda dá tempo de reativar
    if (user.email) {
      await sendAccountDeletionScheduledEmail(user.email, deletionDate)
        .catch((error) => console.error('Falha ao enviar o aviso de exclusão:', error));
    }

    return NextResponse.json({
      success: true,
      message: 'Sua solicitação foi processada e a conta agendada para exclusão definitiva em 30 dias.'
    });
  } catch (error) {
    console.error('Erro na solicitação de exclusão:', error);
    return NextResponse.json({ error: 'Erro interno ao processar a solicitação.' }, { status: 500 });
  }
}
