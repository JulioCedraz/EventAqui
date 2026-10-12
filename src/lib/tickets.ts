import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { sendGuestInviteEmail, sendManualRefundEmail, sendTicketApprovedEmail } from './mail';
import { SITE_URL } from './site';

export async function findCoupon(code: string, eventId: string) {
  const pattern = code.trim().replace(/[\\%_]/g, '\\$&');

  const { data } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('event_id', eventId)
    .ilike('code', pattern)
    .limit(1)
    .maybeSingle();

  return data;
}

// Incremento atômico no banco: evita perder contagens concorrentes.
async function incrementCouponUsage(couponId: string) {
  const { error } = await supabaseAdmin.rpc('increment_coupon_usage', { p_coupon_id: couponId });
  if (error) console.error(`Falha ao contar uso do cupom ${couponId}:`, error);
}

async function sendApprovalEmails(ticketId: string, buyerEmail: string, eventTitle: string) {
  const { data: guest } = await supabaseAdmin
    .from('guests')
    .select('id, guest_name, guest_email, is_claimed')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  const emails = [sendTicketApprovedEmail(buyerEmail, eventTitle, ticketId)];

  if (guest && !guest.is_claimed) {
    emails.push(sendGuestInviteEmail(guest.guest_email, guest.guest_name, eventTitle, `${SITE_URL}/resgatar/${guest.id}`));
  }

  const results = await Promise.allSettled(emails);
  for (const result of results) {
    if (result.status === 'rejected') console.error('Falha ao enviar e-mail:', result.reason);
  }
}

// Pedido vencido pode ter perdido a vaga para outra compra enquanto o pagamento não chegava.
async function hasSpotForLatePayment(eventId: string, quantity: number, totalSpots: number | null) {
  if (totalSpots === null) return true;
  return countSpots(await getActiveTickets(eventId)) + quantity <= totalSpots;
}

// Pagamento que não virou ingresso: o produtor estorna pelo gateway.
// O filtro em refund_requested_at garante um único e-mail mesmo com notificações repetidas.
async function requestManualRefund(ticketId: string, reason: string) {
  console.error(`Pedido ${ticketId}: ${reason} Estorno manual necessário.`);

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .update({ refund_requested_at: new Date().toISOString() })
    .eq('id', ticketId)
    .is('refund_requested_at', null)
    .select('buyer_name, buyer_email, events(title, producer_id)')
    .maybeSingle();

  const event = ticket?.events as { title: string; producer_id: string | null } | null;
  if (!ticket || !event?.producer_id) return;

  const { data: producer } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', event.producer_id)
    .maybeSingle();

  if (!producer?.email) return;

  await sendManualRefundEmail(producer.email, {
    eventTitle: event.title,
    ticketId,
    buyerName: ticket.buyer_name,
    buyerEmail: ticket.buyer_email,
    reason,
  }).catch((error) => console.error('Falha ao enviar e-mail de estorno:', error));
}

// Idempotente: só o primeiro chamador aprova, conta o cupom e dispara e-mails.
// Só pedido pendente é aprovado; pago após o prazo, só se ainda houver vaga.
export async function approveTicket(ticketId: string): Promise<boolean> {
  const { data: current } = await supabaseAdmin
    .from('tickets')
    .select('payment_status, expires_at, quantity, event_id, user_id, events(total_spots)')
    .eq('id', ticketId)
    .maybeSingle();

  if (current?.payment_status !== 'pending') {
    // Sem user_id, a conta foi excluída e o cancelamento veio da exclusão, não de um pagamento perdido.
    if (current?.payment_status === 'cancelled' && current.user_id) {
      await requestManualRefund(ticketId, 'o pedido já estava cancelado quando o pagamento chegou.');
    }
    return false;
  }

  const isExpired = !!current.expires_at && new Date(current.expires_at) <= new Date();
  const totalSpots = (current.events as { total_spots: number | null } | null)?.total_spots ?? null;

  if (isExpired && !(await hasSpotForLatePayment(current.event_id, current.quantity ?? 1, totalSpots))) {
    const { data: cancelled } = await supabaseAdmin
      .from('tickets')
      .update({ payment_status: 'cancelled' })
      .eq('id', ticketId)
      .eq('payment_status', 'pending')
      .select('id')
      .maybeSingle();

    if (cancelled) await requestManualRefund(ticketId, 'o pagamento chegou após o prazo e o evento esgotou.');
    return false;
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .update({ payment_status: 'approved' })
    .eq('id', ticketId)
    .eq('payment_status', 'pending')
    .select('id, coupon_id, buyer_email, events(title)')
    .maybeSingle();

  if (error) throw error;
  if (!ticket) return false;

  if (ticket.coupon_id) await incrementCouponUsage(ticket.coupon_id);

  const event = ticket.events as { title: string } | null;
  await sendApprovalEmails(ticket.id, ticket.buyer_email, event?.title ?? 'Evento');

  return true;
}

// Ingressos que ocupam vaga: aprovados ou pendentes dentro do prazo do PIX.
export async function getActiveTickets(eventId: string) {
  const { data } = await supabaseAdmin
    .from('tickets')
    .select('user_id, quantity, payment_status, expires_at')
    .eq('event_id', eventId)
    .in('payment_status', ['approved', 'pending']);

  const now = new Date();
  return (data ?? []).filter((ticket) =>
    ticket.payment_status === 'approved' || !ticket.expires_at || new Date(ticket.expires_at) > now
  );
}

export const countSpots = (tickets: { quantity: number | null }[]) =>
  tickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 1), 0);

export async function cancelTicket(ticketId: string) {
  await supabaseAdmin
    .from('tickets')
    .update({ payment_status: 'cancelled' })
    .eq('id', ticketId);
}
