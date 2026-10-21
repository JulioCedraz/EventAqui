import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from './supabase-admin';
import { decryptSecret } from './secret-box';
import { checkPayment, InfinitePayError } from './infinitepay';
import { approveTicket } from './tickets';

export type ConfirmationResult = 'approved' | 'not_approved' | 'unpaid' | 'mismatch' | 'gateway_error';

export type PaymentReference = {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  receiptUrl?: string | null;
};

const uuid = z.uuid();

// O comprovante chega pela notificação ou pela URL do redirect: só aceita link da própria InfinitePay.
function trustedReceiptUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isInfinitePay = url.hostname === 'infinitepay.io' || url.hostname.endsWith('.infinitepay.io');
    return url.protocol === 'https:' && isInfinitePay ? url.toString() : null;
  } catch {
    return null;
  }
}

// Webhook e redirect só trazem referências: o status e o valor vêm do payment_check,
// consultado com a API Key do dono do evento (lida do banco, nunca da notificação).
export async function confirmPayment(ref: PaymentReference): Promise<ConfirmationResult> {
  if (!uuid.safeParse(ref.orderNsu).success) return 'mismatch';

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, amount_cents, transaction_nsu, events(producer_id)')
    .eq('id', ref.orderNsu)
    .maybeSingle();

  const producerId = (ticket?.events as { producer_id: string | null } | null)?.producer_id;
  if (!ticket || !producerId || !ticket.amount_cents) return 'mismatch';

  // Um link aceita um único pagamento: outro transaction_nsu no mesmo pedido é suspeito.
  if (ticket.transaction_nsu && ticket.transaction_nsu !== ref.transactionNsu) {
    console.error(`Pedido ${ticket.id} já vinculado a outra transação.`);
    return 'mismatch';
  }

  const { data: producer } = await supabaseAdmin
    .from('profiles')
    .select('infinitepay_handle, infinitepay_api_key_enc')
    .eq('id', producerId)
    .maybeSingle();

  const apiKey = producer?.infinitepay_api_key_enc ? decryptSecret(producer.infinitepay_api_key_enc) : null;
  if (!producer?.infinitepay_handle || !apiKey) {
    console.error(`Produtor ${producerId} sem credenciais da InfinitePay.`);
    return 'gateway_error';
  }

  let payment;
  try {
    payment = await checkPayment({
      apiKey,
      handle: producer.infinitepay_handle,
      orderNsu: ticket.id,
      transactionNsu: ref.transactionNsu,
      slug: ref.slug,
    });
  } catch (error) {
    if (error instanceof InfinitePayError) return 'gateway_error';
    throw error;
  }

  if (!payment.paid) return 'unpaid';

  // Compara o valor do pedido, não o pago: com repasse de juros, paid_amount fica maior.
  if (payment.amount !== ticket.amount_cents) {
    console.error(`Pedido ${ticket.id}: valor pago ${payment.amount} difere do esperado ${ticket.amount_cents}.`);
    return 'mismatch';
  }

  const { error: bindError } = await supabaseAdmin
    .from('tickets')
    .update({
      transaction_nsu: ref.transactionNsu,
      invoice_slug: ref.slug,
      payment_method: payment.capture_method ?? null,
      paid_amount_cents: payment.paid_amount ?? payment.amount,
      installments: payment.installments ?? null,
      receipt_url: trustedReceiptUrl(ref.receiptUrl),
    })
    .eq('id', ticket.id);

  // Violação do UNIQUE: a mesma transação já aprovou outro pedido.
  if (bindError) {
    console.error(`Falha ao vincular a transação ao pedido ${ticket.id}:`, bindError);
    return 'mismatch';
  }

  return (await approveTicket(ticket.id)) ? 'approved' : 'not_approved';
}
