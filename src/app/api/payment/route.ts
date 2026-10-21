import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';
import { applyDiscount, getCouponError } from '@/lib/pricing';
import { approveTicket, cancelTicket, countSpots, findCoupon, getActiveTickets } from '@/lib/tickets';
import { SITE_URL } from '@/lib/site';
import { decryptSecret } from '@/lib/secret-box';
import { createCheckoutLink, InfinitePayError } from '@/lib/infinitepay';

// Prazo da reserva da vaga. O link de pagamento expira junto (valid_until).
const RESERVATION_MINUTES = 30;

const bodySchema = z.object({
  eventId: z.uuid(),
  isCasadinha: z.boolean().default(false),
  couponCode: z.string().trim().min(1).max(50).optional(),
  guest: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    cpf: z.string().trim().min(11).max(14),
    phone: z.string().trim().max(20).optional(),
  }).optional(),
}).refine((body) => !body.isCasadinha || body.guest, { message: 'Dados do convidado obrigatórios.' });

const fail = (erro: string, status: number) => NextResponse.json({ erro }, { status });

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user?.email) return fail('Não autorizado.', 401);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Dados inválidos.', 400);

    const { eventId, isCasadinha, couponCode, guest } = parsed.data;
    const quantity = isCasadinha ? 2 : 1;

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, title, price, total_spots, producer_id')
      .eq('id', eventId)
      .single();

    if (!event) return fail('Evento não encontrado.', 404);

    const activeTickets = await getActiveTickets(eventId);

    if (activeTickets.some((ticket) => ticket.user_id === user.id)) {
      return fail('Você já possui um pedido ativo para este evento.', 409);
    }

    if (event.total_spots !== null && countSpots(activeTickets) + quantity > event.total_spots) {
      return fail('Ingressos esgotados.', 409);
    }

    let coupon = null;
    if (couponCode) {
      coupon = await findCoupon(couponCode, eventId);
      const couponError = coupon ? getCouponError(coupon, eventId, quantity) : 'Cupom inválido ou inexistente.';
      if (couponError) return fail(couponError, 400);
    }

    const amount = applyDiscount(Number(event.price) * quantity, coupon);
    const amountCents = Math.round(amount * 100);
    const expiresAt = amountCents > 0
      ? new Date(Date.now() + RESERVATION_MINUTES * 60_000).toISOString()
      : null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const buyerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Usuário';

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        event_id: eventId,
        user_id: user.id,
        buyer_name: buyerName,
        buyer_email: user.email,
        payment_status: 'pending',
        quantity,
        is_used: false,
        coupon_id: coupon?.id ?? null,
        amount_cents: amountCents,
        payment_method: amountCents === 0 ? 'free' : null,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (ticketError || !ticket) throw ticketError;

    if (guest) {
      const { error: guestError } = await supabaseAdmin.from('guests').insert({
        ticket_id: ticket.id,
        buyer_id: user.id,
        guest_name: guest.name,
        guest_email: guest.email.toLowerCase(),
        guest_cpf: guest.cpf,
        guest_phone: guest.phone || null,
      });

      if (guestError) {
        await cancelTicket(ticket.id);
        throw guestError;
      }
    }

    if (amountCents === 0) {
      await approveTicket(ticket.id);
      return NextResponse.json({ ticketId: ticket.id, is_free: true, status: 'approved' });
    }

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('infinitepay_api_key_enc')
      .eq('id', event.producer_id!)
      .single();

    const apiKey = producer?.infinitepay_api_key_enc ? decryptSecret(producer.infinitepay_api_key_enc) : null;
    if (!apiKey) {
      await cancelTicket(ticket.id);
      return fail('O organizador deste evento ainda não configurou o recebimento.', 400);
    }

    let checkoutUrl: string;
    try {
      checkoutUrl = await createCheckoutLink({
        apiKey,
        orderNsu: ticket.id,
        amountCents,
        description: `${event.title} (${quantity}x)`,
        customer: { name: buyerName, email: user.email },
        redirectUrl: `${SITE_URL}/evento/${eventId}/${ticket.id}`,
        webhookUrl: `${SITE_URL}/api/webhook`,
        validUntil: expiresAt!,
      });
    } catch (error) {
      await cancelTicket(ticket.id);
      if (error instanceof InfinitePayError) return fail('Falha ao gerar o pagamento. Tente novamente.', 502);
      throw error;
    }

    const { error: linkError } = await supabaseAdmin
      .from('tickets')
      .update({ checkout_url: checkoutUrl })
      .eq('id', ticket.id);

    if (linkError) {
      await cancelTicket(ticket.id);
      throw linkError;
    }

    return NextResponse.json({ ticketId: ticket.id, checkout_url: checkoutUrl, expires_at: expiresAt });
  } catch (error) {
    console.error('Erro interno no pagamento:', error);
    return fail('Erro interno no servidor.', 500);
  }
}
