import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { sendGuestInviteEmail, sendTicketApprovedEmail } from './mail';
import { SITE_URL } from './site';

// eventId precisa chegar já validado como UUID (vai para o filtro .or).
export async function findCoupon(code: string, eventId: string) {
  const pattern = code.trim().replace(/[\\%_]/g, '\\$&');

  const { data } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .ilike('code', pattern)
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order('event_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// TODO(db): trocar por incremento atômico via RPC na migration de segurança.
async function incrementCouponUsage(couponId: string) {
  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('used_count')
    .eq('id', couponId)
    .single();

  if (!coupon) return;

  await supabaseAdmin
    .from('coupons')
    .update({ used_count: (coupon.used_count ?? 0) + 1 })
    .eq('id', couponId);
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

// Idempotente: só o primeiro chamador aprova, conta o cupom e dispara e-mails.
export async function approveTicket(ticketId: string): Promise<boolean> {
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .update({ payment_status: 'approved' })
    .eq('id', ticketId)
    .neq('payment_status', 'approved')
    .select('id, coupon_id, buyer_email, events(title)')
    .maybeSingle();

  if (error) throw error;
  if (!ticket) return false;

  if (ticket.coupon_id) await incrementCouponUsage(ticket.coupon_id);

  const event = ticket.events as { title: string } | null;
  await sendApprovalEmails(ticket.id, ticket.buyer_email, event?.title ?? 'Evento');

  return true;
}

export async function cancelTicket(ticketId: string) {
  await supabaseAdmin
    .from('tickets')
    .update({ payment_status: 'cancelled' })
    .eq('id', ticketId);
}
