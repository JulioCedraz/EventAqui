import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.type !== 'payment' && body.topic !== 'payment') {
      return NextResponse.json({ message: 'Notificação ignorada' }, { status: 200 });
    }

    const paymentId = body.data?.id;

    if (!paymentId) {
      return NextResponse.json({ erro: 'ID do pagamento não fornecido' }, { status: 400 });
    }

    const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`
      }
    });

    const paymentData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro ao consultar Mercado Pago:', paymentData);
      return NextResponse.json({ erro: 'Falha ao verificar pagamento' }, { status: 502 });
    }

    if (paymentData.status === 'approved') {
      const ticketId = paymentData.external_reference; 

      if (ticketId) {
        const { data: ticketData, error: erroUpdate } = await supabaseAdmin
          .from('tickets')
          .update({ payment_status: 'approved' })
          .eq('id', String(ticketId))
          .select('coupon_id')
          .single();

        if (erroUpdate) {
          console.error('Erro ao atualizar banco:', erroUpdate);
          return NextResponse.json({ erro: 'Falha ao atualizar banco' }, { status: 500 });
        }
        
        if (ticketData?.coupon_id) {
          const { data: couponData } = await supabaseAdmin
            .from('coupons')
            .select('used_count')
            .eq('id', ticketData.coupon_id)
            .single();

          if (couponData) {
            await supabaseAdmin
              .from('coupons')
              .update({ used_count: (couponData.used_count || 0) + 1 })
              .eq('id', ticketData.coupon_id);
          }
        }

        console.log(`Ingresso ${ticketId} atualizado para APPROVED com sucesso.`);
      }
    }

    return NextResponse.json({ recebido: true }, { status: 200 });

  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ erro: 'Erro interno no Webhook' }, { status: 500 });
  }
}