import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmPayment } from '@/lib/payment-confirmation';

// A notificação da InfinitePay não tem assinatura: serve só para disparar a consulta
// ao payment_check. Nenhum campo dela aprova ingresso por si só.
const notificationSchema = z.object({
  order_nsu: z.string().min(1).max(100),
  transaction_nsu: z.string().min(1).max(100),
  invoice_slug: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  receipt_url: z.string().max(500).nullish(),
}).refine((body) => body.invoice_slug || body.slug);

// 200 encerra a entrega; 400 faz a InfinitePay tentar de novo.
const done = (message: string) => NextResponse.json({ message }, { status: 200 });

export async function POST(request: Request) {
  try {
    const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return done('Notificação ignorada');

    const body = parsed.data;
    const result = await confirmPayment({
      orderNsu: body.order_nsu,
      transactionNsu: body.transaction_nsu,
      slug: (body.invoice_slug ?? body.slug)!,
      receiptUrl: body.receipt_url,
    });

    if (result === 'gateway_error') {
      return NextResponse.json({ erro: 'Falha ao verificar pagamento' }, { status: 400 });
    }

    console.log(`Webhook do pedido ${body.order_nsu}: ${result}.`);
    return done(result);
  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ erro: 'Erro interno no Webhook' }, { status: 500 });
  }
}
