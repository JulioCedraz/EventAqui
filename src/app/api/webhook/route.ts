import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transporter, generateQrCodeUrl } from '@/lib/mail';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Extrai o producerId diretamente da URL que o Mercado Pago chamou
    const { searchParams } = new URL(request.url);
    const producerId = searchParams.get('producerId');
    
    if (body.type !== 'payment' && body.topic !== 'payment') {
      return NextResponse.json({ message: 'Notificação ignorada' }, { status: 200 });
    }

    const paymentId = body.data?.id;

    if (!paymentId || !producerId) {
      return NextResponse.json({ erro: 'ID do pagamento ou Produtor não fornecido' }, { status: 400 });
    }

    // 2. Busca o token de acesso específico DESTE produtor no banco
    const { data: producer, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('mp_access_token')
      .eq('id', producerId)
      .single();

    if (dbError || !producer?.mp_access_token) {
      console.error(`Token não encontrado para o produtor: ${producerId}`);
      return NextResponse.json({ erro: 'Token do produtor não configurado' }, { status: 400 });
    }
    
    // 3. Consulta a API do Mercado Pago usando o Token correto
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${producer.mp_access_token}`
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
        // Atualiza o ticket para Aprovado
        const { data: ticketData, error: erroUpdate } = await supabaseAdmin
          .from('tickets')
          .update({ payment_status: 'approved' })
          .eq('id', String(ticketId))
          .select('coupon_id, buyer_email')
          .single();

        if (erroUpdate) {
          console.error('Erro ao atualizar banco:', erroUpdate);
          return NextResponse.json({ erro: 'Falha ao atualizar banco' }, { status: 500 });
        }
        
        // Atualiza a contagem de uso de cupons, se existir
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

        // =================================================================
        // DISPARO DE E-MAILS (COMPRADOR E CONVIDADO CASADINHA)
        // =================================================================
        const title = paymentData.description || 'Evento';
        const email = paymentData.payer?.email || ticketData?.buyer_email;

        // E-mail 1: Ingresso do Comprador
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
                <p style="font-size: 16px;">Seu pagamento foi confirmado e o seu ingresso para <strong>${title}</strong> já está disponível.</p>
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
        
        await transporter.sendMail(buyerMailOptions).catch(console.error);

        // E-mail 2: Link Mágico do Convidado (Se for Casadinha)
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
          await transporter.sendMail(guestMailOptions).catch(console.error);
        }
        // =================================================================

        console.log(`Ingresso ${ticketId} atualizado para APPROVED e e-mails disparados.`);
      }
    }

    return NextResponse.json({ recebido: true }, { status: 200 });

  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ erro: 'Erro interno no Webhook' }, { status: 500 });
  }
}