import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCouponError } from '@/lib/pricing';
import { findCoupon } from '@/lib/tickets';

const bodySchema = z.object({
  couponCode: z.string().trim().min(1).max(50),
  eventId: z.uuid(),
  isCasadinha: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Código do cupom e ID do evento são obrigatórios.' }, { status: 400 });
    }

    const { couponCode, eventId, isCasadinha } = parsed.data;
    const coupon = await findCoupon(couponCode, eventId);

    if (!coupon) {
      return NextResponse.json({ erro: 'Cupom inválido ou inexistente.' }, { status: 404 });
    }

    const couponError = getCouponError(coupon, eventId, isCasadinha ? 2 : 1);
    if (couponError) {
      return NextResponse.json({ erro: couponError }, { status: 400 });
    }

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      is_casadinha_only: coupon.is_casadinha_only,
    });
  } catch (error) {
    console.error('Erro na validação do cupom:', error);
    return NextResponse.json({ erro: 'Erro interno ao validar o cupom.' }, { status: 500 });
  }
}
