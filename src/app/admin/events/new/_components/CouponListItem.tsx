'use client';

import { Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import type { LocalCoupon } from '../types';

type Props = {
  coupon: LocalCoupon;
  canShare: boolean;
  showTooltip: boolean;
  onShare: () => void;
  onRemove: () => void;
};

export function CouponListItem({ coupon, canShare, showTooltip, onShare, onRemove }: Props) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded text-sm tracking-wide">
            {coupon.code}
          </span>
          {coupon.is_casadinha_only && (
            <span className="font-bold uppercase bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-0.5 rounded text-[10px] tracking-wide">
              Exclusivo Casadinha
            </span>
          )}
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `${formatBRL(coupon.discount_value)} OFF`}
          </span>
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex gap-2 mt-1">
          <span>{coupon.max_uses ? `${coupon.used_count || 0}/${coupon.max_uses} usos` : 'Uso ilimitado'}</span>
          <span>•</span>
          <span>{coupon.expires_at ? `Validade: ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}` : 'Sem validade'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {canShare && (
          <div className="relative flex items-center justify-center">
            {showTooltip && (
              <div className="absolute bottom-full mb-3 right-0 w-56 bg-blue-600 text-white text-sm leading-tight font-medium p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                 Divulgue o evento com este cupom já aplicado! ✅
                <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-blue-600 rotate-45 rounded-sm"></div>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onShare}
              className={`transition-all duration-300 rounded-xl ${showTooltip ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 animate-pulse' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-500/10'}`}
              title="Divulgue o evento com este cupom já aplicado!"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl"
          title="Remover cupom"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
