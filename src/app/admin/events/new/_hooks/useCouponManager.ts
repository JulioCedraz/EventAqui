'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DialogConfig } from '@/components/SmartModal';
import type { CouponDraft, LocalCoupon } from '../types';

const EMPTY_DRAFT: CouponDraft = {
  code: '',
  type: 'fixed',
  value: '',
  maxUses: '',
  expires: '',
  isCasadinhaOnly: false,
};

type Options = {
  editId: string | null;
  currentUserId: string | null;
  coupons: LocalCoupon[];
  setCoupons: Dispatch<SetStateAction<LocalCoupon[]>>;
};

export function useCouponManager({ editId, currentUserId, coupons, setCoupons }: Options) {
  const [draft, setDraft] = useState<CouponDraft>(EMPTY_DRAFT);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [showTooltipFor, setShowTooltipFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const updateDraft = (patch: Partial<CouponDraft>) => setDraft(prev => ({ ...prev, ...patch }));

  const handleAddCoupon = async () => {
    if (!draft.code.trim() || !draft.value) {
      toast.error('Código e Valor são obrigatórios para criar um cupom.');
      return;
    }

    const numValue = parseFloat(draft.value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Valor do cupom inválido.');
      return;
    }

    if (draft.type === 'percentage' && numValue > 100) {
      toast.error('A porcentagem de desconto não pode ser maior que 100%.');
      return;
    }

    const fields = {
      code: draft.code.toUpperCase().trim(),
      discount_type: draft.type,
      discount_value: numValue,
      max_uses: draft.maxUses ? parseInt(draft.maxUses, 10) : null,
      expires_at: draft.expires ? new Date(draft.expires).toISOString() : null,
      is_casadinha_only: draft.isCasadinhaOnly
    };

    if (editId) {
      setIsSavingCoupon(true);

      const { data: insertedCoupon, error } = await supabase
        .from('coupons')
        .insert({ ...fields, event_id: editId, producer_id: currentUserId })
        .select()
        .single();

      setIsSavingCoupon(false);

      if (error) {
        toast.error(error.code === '23505'
          ? 'Este código de cupom já existe para este evento.'
          : 'Erro ao salvar o cupom diretamente no banco.');
        return;
      }

      setCoupons([...coupons, insertedCoupon as LocalCoupon]);
      toast.success('Cupom ativado com sucesso!');

      setShowTooltipFor(insertedCoupon.id);
      setTimeout(() => setShowTooltipFor(null), 6000);
    } else {
      setCoupons([...coupons, { ...fields, id: `temp_${Date.now()}`, isNew: true }]);
    }

    setDraft(EMPTY_DRAFT);
    setShowCouponForm(false);
  };

  const handleRemoveCoupon = (idToRemove: string, isNew?: boolean) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Cupom',
      message: 'Tem certeza que deseja excluir este cupom? Esta ação é imediata e não pode ser desfeita.',
      confirmText: 'Sim, excluir',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          if (!isNew && editId) {
            const { error } = await supabase
              .from('coupons')
              .delete()
              .eq('id', idToRemove);

            if (error) throw error;
          }

          setCoupons(prev => prev.filter(c => c.id !== idToRemove));
          toast.success('Cupom excluído com sucesso!');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao excluir cupom:', error);
          toast.error('Erro ao excluir o cupom. Tente novamente.');
        } finally {
          setIsModalProcessing(false);
        }
      }
    });
  };

  const copyPromoLink = (code: string) => {
    const url = `${window.location.origin}/evento/${editId}?cupom=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link promocional copiado!');
    setShowTooltipFor(null);
  };

  return {
    editId,
    coupons,
    draft,
    updateDraft,
    showCouponForm,
    setShowCouponForm,
    isSavingCoupon,
    showTooltipFor,
    dialog,
    closeDialog: () => setDialog(null),
    isModalProcessing,
    handleAddCoupon,
    handleRemoveCoupon,
    copyPromoLink,
  };
}

export type CouponManager = ReturnType<typeof useCouponManager>;
