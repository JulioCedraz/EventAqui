'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AppliedCoupon } from '../types';

type Options = {
  eventId: string | undefined;
  isCasadinha: boolean;
  autoCoupon: string | null | undefined;
};

export function useCoupon({ eventId, isCasadinha, autoCoupon }: Options) {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const hasAutoApplied = useRef(false);

  const applyCoupon = async (code: string = couponInput) => {
    if (!code.trim()) return;
    setIsApplyingCoupon(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code, eventId, isCasadinha }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.erro || 'Cupom inválido.');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(data);
      toast.success('Cupom aplicado com sucesso!');
      setCouponInput(code.toUpperCase());
    } catch {
      toast.error('Erro ao validar o cupom.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Cupom removido.', { position: 'bottom-center' });
  };

  // Cupom exclusivo da casadinha deixa de valer quando o comprador volta para o individual
  const dropCasadinhaOnlyCoupon = () => {
    if (!appliedCoupon?.is_casadinha_only) return;
    setAppliedCoupon(null);
    setCouponInput('');
    toast.info('Cupom removido. Ele é válido exclusivamente para a opção Casadinha.', { duration: 5000 });
  };

  useEffect(() => {
    if (!eventId || !autoCoupon || hasAutoApplied.current) return;
    hasAutoApplied.current = true;
    setCouponInput(autoCoupon.toUpperCase());
    applyCoupon(autoCoupon);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aplica o cupom da URL uma única vez
  }, [eventId, autoCoupon]);

  return { couponInput, setCouponInput, appliedCoupon, isApplyingCoupon, applyCoupon, removeCoupon, dropCasadinhaOnlyCoupon };
}
