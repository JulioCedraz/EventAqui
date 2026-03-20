import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Recebemos os dados enviados pelo nosso Front-end
    const body = await request.json();
    const { titulo, preco, email, ticketId } = body;

    // 2. Trava de segurança: verificamos se a chave do Mercado Pago existe
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('Chave do Mercado Pago não configurada no servidor.');
    }

    // 3. Criamos uma chave única de segurança para evitar cobranças duplicadas (Idempotency)
    const idempotencyKey = crypto.randomUUID();

    // 4. Fazemos a requisição oficial para a API do Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: Number(preco),
        description: `Ingresso: ${titulo}`,
        payment_method_id: 'pix',
        payer: {
          email: email,
        },
        external_reference: ticketId, // Conecta a transação do MP com o ID do nosso banco
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', data);
      throw new Error(data.message || 'Erro ao gerar PIX no Mercado Pago');
    }

    // 5. Devolvemos apenas os dados limpos do PIX para o nosso Front-end exibir
    return NextResponse.json({
      payment_id: data.id,
      qr_code: data.point_of_interaction.transaction_data.qr_code, // O "Copia e Cola"
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64, // A imagem
    });

  } catch (error: any) {
    console.error('Erro na API de pagamento:', error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}