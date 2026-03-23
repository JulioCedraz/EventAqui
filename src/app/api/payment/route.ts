import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { title, price, email, ticketId } = body;

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('Chave do Mercado Pago não configurada no servidor.');
    }

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: Number(price),
        description: `Ingresso: ${title}`,
        payment_method_id: 'pix',
        payer: {
          email: email,
        },
        external_reference: ticketId,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', data);
      throw new Error(data.message || 'Erro ao gerar PIX no Mercado Pago');
    }

    return NextResponse.json({
      payment_id: data.id,
      qr_code: data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
    });

  } catch (error: any) {
    console.error('Erro na API de pagamento:', error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}