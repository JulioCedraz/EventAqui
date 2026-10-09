import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser } from '@/lib/auth';
import { applyDiscount, getCouponError } from '@/lib/pricing';
import { approveTicket, cancelTicket, findCoupon } from '@/lib/tickets';
import { SITE_URL } from '@/lib/site';

const PIX_EXPIRATION_MINUTES = 30;

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

const isActive = (ticket: { payment_status: string | null; expires_at: string | null }) =>
  ticket.payment_status === 'approved' || !ticket.expires_at || new Date(ticket.expires_at) > new Date();

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

    // Ingressos que ainda ocupam vaga: aprovados ou pendentes dentro do prazo do PIX.
    const { data: occupied } = await supabaseAdmin
      .from('tickets')
      .select('user_id, quantity, payment_status, expires_at')
      .eq('event_id', eventId)
      .in('payment_status', ['approved', 'pending']);

    const activeTickets = (occupied ?? []).filter(isActive);

    if (activeTickets.some((ticket) => ticket.user_id === user.id)) {
      return fail('Você já possui um pedido ativo para este evento.', 409);
    }

    if (event.total_spots !== null) {
      const sold = activeTickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 1), 0);
      if (sold + quantity > event.total_spots) return fail('Ingressos esgotados.', 409);
    }

    let coupon = null;
    if (couponCode) {
      coupon = await findCoupon(couponCode, eventId);
      const couponError = coupon ? getCouponError(coupon, eventId, quantity) : 'Cupom inválido ou inexistente.';
      if (couponError) return fail(couponError, 400);
    }

    const amount = applyDiscount(Number(event.price) * quantity, coupon);
    const expiresAt = amount > 0
      ? new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60_000).toISOString()
      : null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, trading_name, company_name')
      .eq('id', user.id)
      .single();

    const buyerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || profile?.trading_name || profile?.company_name || 'Usuário';

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

    // Gratuito (evento sem custo ou cupom de 100%): aprova direto no servidor.
    if (amount === 0) {
      await approveTicket(ticket.id);
      return NextResponse.json({ ticketId: ticket.id, is_free: true, status: 'approved' });
    }

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('mp_access_token')
      .eq('id', event.producer_id!)
      .single();

    if (!producer?.mp_access_token) {
      await cancelTicket(ticket.id);
      return fail('O organizador deste evento ainda não configurou o recebimento.', 400);
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${producer.mp_access_token}`,
        'X-Idempotency-Key': ticket.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `${event.title} (${quantity}x)`,
        payment_method_id: 'pix',
        payer: { email: user.email },
        date_of_expiration: expiresAt,
        external_reference: ticket.id,
        notification_url: `${SITE_URL}/api/webhook?producerId=${event.producer_id}`,
      }),
    });

    const payment = await mpResponse.json();
    const pix = payment.point_of_interaction?.transaction_data;

    if (!mpResponse.ok || !pix?.qr_code) {
      console.error('Erro Mercado Pago:', payment);
      await cancelTicket(ticket.id);
      return fail('Falha ao gerar o PIX. Tente novamente.', 502);
    }

    // O QR salvo aqui é o que o webhook usa para confirmar que o pagamento é deste ingresso.
    const { error: pixError } = await supabaseAdmin
      .from('tickets')
      .update({ pix_qr_code: pix.qr_code, pix_qr_code_base64: pix.qr_code_base64 })
      .eq('id', ticket.id);

    if (pixError) {
      await cancelTicket(ticket.id);
      throw pixError;
    }

    return NextResponse.json({
      ticketId: ticket.id,
      id: payment.id,
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Erro interno no pagamento:', error);
    return fail('Erro interno no servidor.', 500);
  }
}
