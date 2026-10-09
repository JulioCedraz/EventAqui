import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { approveTicket } from '@/lib/tickets';

const uuid = z.uuid();

// Respostas 200 em casos ignorados evitam que o Mercado Pago fique reenviando.
const ignore = (message: string) => NextResponse.json({ message }, { status: 200 });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (body?.type !== 'payment' && body?.topic !== 'payment') return ignore('Notificação ignorada');

    const producerId = new URL(request.url).searchParams.get('producerId');
    const paymentId = body.data?.id;

    if (!paymentId || !uuid.safeParse(producerId).success) {
      return NextResponse.json({ erro: 'Notificação inválida' }, { status: 400 });
    }

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('mp_access_token')
      .eq('id', producerId!)
      .single();

    if (!producer?.mp_access_token) {
      console.error(`Token não encontrado para o produtor: ${producerId}`);
      return NextResponse.json({ erro: 'Produtor não configurado' }, { status: 400 });
    }

    // A notificação não é confiável: o status vem da consulta direta ao Mercado Pago.
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { 'Authorization': `Bearer ${producer.mp_access_token}` },
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro ao consultar Mercado Pago:', payment);
      return NextResponse.json({ erro: 'Falha ao verificar pagamento' }, { status: 502 });
    }

    if (payment.status !== 'approved') return ignore('Pagamento ainda não aprovado');

    const ticketId = String(payment.external_reference ?? '');
    if (!uuid.safeParse(ticketId).success) return ignore('Referência inválida');

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, pix_qr_code, events(producer_id)')
      .eq('id', ticketId)
      .single();

    // O pagamento precisa ser o PIX que geramos para este ingresso, na conta do dono do evento.
    const event = ticket?.events as { producer_id: string | null } | null;
    const pixQrCode = payment.point_of_interaction?.transaction_data?.qr_code;

    if (!ticket || event?.producer_id !== producerId || !ticket.pix_qr_code || ticket.pix_qr_code !== pixQrCode) {
      console.error(`Pagamento ${paymentId} não corresponde ao ingresso ${ticketId}.`);
      return ignore('Pagamento não corresponde ao ingresso');
    }

    const approved = await approveTicket(ticketId);
    console.log(approved
      ? `Ingresso ${ticketId} aprovado e e-mails disparados.`
      : `Ingresso ${ticketId} já estava aprovado.`);

    return NextResponse.json({ recebido: true }, { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ erro: 'Erro interno no Webhook' }, { status: 500 });
  }
}
