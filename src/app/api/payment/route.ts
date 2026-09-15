import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { transporter, generateQrCodeUrl } from '@/lib/mail';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: Request) {
  try {
    const { title, price, email, ticketId, expires_at, producerId, couponCode } = await request.json();

    if (!title || price === undefined || !email || !ticketId || !producerId) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('event_id, quantity')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ erro: 'Ingresso não encontrado para validação.' }, { status: 404 });
    }

    let finalPrice = Number(price);
    let appliedCouponId = null;
    let couponData = null;

    // =========================================
    // VALIDAÇÃO E CÁLCULO DE CUPOM
    // =========================================
    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', couponCode.trim())
        .single();

      if (couponError || !coupon) {
        return NextResponse.json({ erro: 'Cupom inválido ou inexistente.' }, { status: 400 });
      }

      if (coupon.event_id && coupon.event_id !== ticket.event_id) {
        return NextResponse.json({ erro: 'Este cupom não é válido para este evento.' }, { status: 400 });
      }

      if (coupon.is_casadinha_only && ticket.quantity < 2) {
        return NextResponse.json({ erro: 'Este cupom é exclusivo para ingressos Casadinha.' }, { status: 400 });
      }
      
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json({ erro: 'Este cupom já está expirado.' }, { status: 400 });
      }

      if (coupon.max_uses !== null && coupon.used_count !== null && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json({ erro: 'Este cupom atingiu o limite máximo de utilizações.' }, { status: 400 });
      }

      if (coupon.discount_type === 'percentage') {
        finalPrice = finalPrice - (finalPrice * (Number(coupon.discount_value) / 100));
      } else if (coupon.discount_type === 'fixed') {
        finalPrice = finalPrice - Number(coupon.discount_value);
      }

      finalPrice = Math.max(0, finalPrice);
      appliedCouponId = coupon.id;
      couponData = coupon;

      await supabaseAdmin
        .from('tickets')
        .update({ coupon_id: appliedCouponId })
        .eq('id', ticketId);
    }

    // ===================================================================
    // EVENTOS GRATUITOS (Ou com cupons de 100% de desconto)
    // ===================================================================
    if (finalPrice === 0) {
      await supabaseAdmin
        .from('tickets')
        .update({ payment_status: 'approved' })
        .eq('id', ticketId);

      if (appliedCouponId && couponData) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: (couponData.used_count || 0) + 1 })
          .eq('id', appliedCouponId);
      }

      // =================================================================
      // DISPARO DE E-MAILS (COMPRADOR E CONVIDADO CASADINHA)
      // =================================================================
      
      // 1. Envia o ingresso oficial com QR Code para o Comprador
      const buyerQrUrl = generateQrCodeUrl(ticketId);
      const buyerMailOptions = {
        from: '"EventAqui" <eventaqui@gmail.com>',
        to: email, 
        subject: `🎫 Seu ingresso para ${title} está garantido!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 30px; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Ingresso Aprovado!</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Seu ingresso para <strong>${title}</strong> já está disponível.</p>
              <p style="font-size: 14px; color: #666;">Apresente o QR Code abaixo na portaria do evento:</p>
              
              <img src="${buyerQrUrl}" alt="QR Code do Ingresso" style="width: 250px; height: 250px; margin: 20px auto; border-radius: 8px; border: 1px solid #ddd;" />
              
              <p style="font-size: 12px; color: #888;">Código do ingresso (caso o leitor falhe):</p>
              <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
                ${ticketId}
              </div>
            </div>
          </div>
        `
      };
      
      transporter.sendMail(buyerMailOptions).catch(console.error);

      // 2. Busca se há um convidado (Casadinha) para disparar o Link Mágico
      const { data: guestData } = await supabaseAdmin
        .from('guests')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

      if (guestData && !guestData.is_claimed) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eventaqui.vercel.app';
        const magicLink = `${baseUrl}/resgatar/${guestData.id}`;
        
        const guestMailOptions = {
          from: '"EventAqui" <eventaqui@gmail.com>',
          to: guestData.guest_email,
          subject: `🎁 Você ganhou um ingresso para ${title}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: center; border: 1px solid #eaeaea; border-radius: 12px;">
              <div style="padding: 30px;">
                <h2 style="color: #2563eb;">Olá, ${guestData.guest_name}!</h2>
                <p>Você acaba de ganhar um ingresso <strong>Casadinha</strong> para <strong>${title}</strong>.</p>
                <p>Para emitir o seu QR Code oficial no seu nome, vincule este ingresso ao seu perfil gratuitamente clicando abaixo:</p>
                <a href="${magicLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
                  Resgatar Meu Ingresso
                </a>
                <p style="font-size: 12px; color: #888;">Link alternativo: <br/> ${magicLink}</p>
              </div>
            </div>
          `
        };
        transporter.sendMail(guestMailOptions).catch(console.error);
      }
      // =================================================================

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
    // INTEGRAÇÃO MERCADO PAGO (Eventos Pagos)
    // =========================================
    const idempotencyKey = crypto.randomUUID();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eventaqui.vercel.app';
    
    const transactionAmount = Number(finalPrice.toFixed(2));

    const paymentData = {
      transaction_amount: transactionAmount,
      description: title,
      payment_method_id: 'pix',
      payer: { email: email },
      date_of_expiration: expires_at,
      external_reference: ticketId,
      notification_url: `${baseUrl}/api/webhook?producerId=${producerId}`
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