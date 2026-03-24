import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { title, price, email, ticketId, expires_at } = await request.json();

    if (!title || !price || !email || !ticketId || !expires_at) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    const idempotencyKey = crypto.randomUUID();

    const paymentData = {
      transaction_amount: Number(price),
      description: title,
      payment_method_id: 'pix',
      payer: { email: email },
      date_of_expiration: expires_at,
      external_reference: ticketId,
      notification_url: 'https://eventaqui.vercel.app/api/webhook'
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
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