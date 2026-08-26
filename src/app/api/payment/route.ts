// src/app/api/payment/route.ts

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const { title, price, email, ticketId, expires_at, producerId } = await request.json();

    if (!title || price === undefined || !email || !ticketId || !producerId) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    // =========================================
    // EVENTOS GRATUITOS
    // =========================================
    if (Number(price) === 0) {
      return NextResponse.json({
        id: `free_${crypto.randomUUID()}`,
        is_free: true,
        status: 'approved',
        qr_code: null,
        qr_code_base64: null,
        expires_at: null
      });
    }

    if (!expires_at) {
      return NextResponse.json({ erro: 'Dados de expiração incompletos' }, { status: 400 });
    }

    // =========================================
    // BUSCA O TOKEN DO PRODUTOR NO BANCO
    // =========================================
    const { data: producer, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('mp_access_token')
      .eq('id', producerId)
      .single();

    if (dbError || !producer?.mp_access_token) {
      return NextResponse.json({ 
        erro: 'O organizador deste evento ainda não configurou o recebimento.' 
      }, { status: 400 });
    }

    // =========================================
    // CÁLCULO DA TAXA DA PLATAFORMA (SPLIT)
    // =========================================
    // const PLATFORM_FEE_PERCENTAGE = 0.10;
    // const applicationFee = Number((Number(price) * PLATFORM_FEE_PERCENTAGE).toFixed(2));

    // =========================================
    // INTEGRAÇÃO MERCADO PAGO (Eventos Pagos)
    // =========================================
    const idempotencyKey = crypto.randomUUID();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eventaqui.vercel.app';
    const paymentData = {
      transaction_amount: Number(price),
      // application_fee: applicationFee,
      description: title,
      payment_method_id: 'pix',
      payer: { email: email },
      date_of_expiration: expires_at,
      external_reference: ticketId,
      notification_url: `${baseUrl}/api/webhook`
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${producer.mp_access_token}`,
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', data);
      return NextResponse.json({ erro: data.message || 'Falha na API do Mercado Pago' }, { status: response.status });
    }

    return NextResponse.json({
      id: data.id,
      qr_code: data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
      expires_at: expires_at 
    });

  } catch (error: any) {
    console.error('Erro interno:', error);
    return NextResponse.json({ erro: 'Erro interno no servidor' }, { status: 500 });
  }
}