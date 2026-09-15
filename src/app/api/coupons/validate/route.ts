import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { couponCode, eventId, isCasadinha } = await request.json();

    if (!couponCode || !eventId) {
      return NextResponse.json(
        { erro: 'Código do cupom e ID do evento são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .ilike('code', couponCode.trim())
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { erro: 'Cupom inválido ou inexistente.' },
        { status: 404 }
      );
    }

    // ==========================================
    // REGRAS DE VALIDAÇÃO
    // ==========================================

    // 1. Verificação de Escopo (Evento)
    if (coupon.event_id && coupon.event_id !== eventId) {
      return NextResponse.json({ erro: 'Este cupom não é válido para este evento.' }, { status: 400 });
    }

    // 2. Verificação de Exclusividade Casadinha
    if (coupon.is_casadinha_only && !isCasadinha) {
      return NextResponse.json({ erro: 'Este cupom é válido exclusivamente para ingressos do tipo Casadinha (2x).' }, { status: 400 });
    }

    // 3. Verificação de Validade (Data)
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ erro: 'Este cupom já expirou.' }, { status: 400 });
    }

    // 4. Verificação de Escassez (Limite de usos)
    if (coupon.max_uses !== null && coupon.used_count !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ erro: 'Este cupom atingiu o limite de utilizações.' }, { status: 400 });
    }

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      is_casadinha_only: coupon.is_casadinha_only
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na validação do cupom:', error);
    return NextResponse.json({ erro: 'Erro interno ao validar o cupom.' }, { status: 500 });
  }
}