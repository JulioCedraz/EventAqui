import 'server-only';
import { z } from 'zod';

// Cliente do Checkout Integrado da InfinitePay.
// Doc: https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay
const API_URL = 'https://api.checkout.infinitepay.io';

export type CaptureMethod = 'pix' | 'credit_card';

export type CheckoutLinkInput = {
  apiKey: string;
  orderNsu: string;
  amountCents: number;
  description: string;
  customer: { name: string; email: string };
  redirectUrl: string;
  webhookUrl: string;
  validUntil: string;
};

const linkResponseSchema = z.object({ url: z.url() });

const paymentCheckSchema = z.object({
  paid: z.boolean(),
  amount: z.number().int(),
  paid_amount: z.number().int().nullish(),
  installments: z.number().int().nullish(),
  capture_method: z.enum(['pix', 'credit_card']).nullish(),
});

export type PaymentCheck = z.infer<typeof paymentCheckSchema>;

export class InfinitePayError extends Error {}

async function post(path: string, apiKey: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(`InfinitePay ${path} respondeu ${response.status}:`, data);
    throw new InfinitePayError(`InfinitePay ${path} falhou com status ${response.status}.`);
  }

  return data;
}

// O valor vai como um item único: o desconto do cupom já está aplicado no total.
// assured_installments 0: o comprador paga os juros do parcelamento, não o produtor.
export async function createCheckoutLink(input: CheckoutLinkInput): Promise<string> {
  const data = await post('/links', input.apiKey, {
    order_nsu: input.orderNsu,
    redirect_url: input.redirectUrl,
    items: [{ quantity: 1, price: input.amountCents, description: input.description }],
    customer: input.customer,
    webhook: { url: input.webhookUrl, events: ['paid'] },
    options: {
      single_payment: true,
      valid_until: input.validUntil,
      payment_methods_enabled: ['pix', 'credit_card'],
      assured_installments: 0,
    },
  });

  const parsed = linkResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Resposta inesperada da InfinitePay ao criar link:', data);
    throw new InfinitePayError('Resposta sem URL de checkout.');
  }

  return parsed.data.url;
}

export async function checkPayment(input: {
  apiKey: string;
  handle: string;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}): Promise<PaymentCheck> {
  const data = await post('/payment_check', input.apiKey, {
    handle: input.handle,
    order_nsu: input.orderNsu,
    transaction_nsu: input.transactionNsu,
    slug: input.slug,
  });

  const parsed = paymentCheckSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Resposta inesperada da InfinitePay ao consultar pagamento:', data);
    throw new InfinitePayError('Resposta de payment_check inválida.');
  }

  return parsed.data;
}
