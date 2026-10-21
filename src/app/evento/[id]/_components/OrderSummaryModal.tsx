'use client';

import { Clock, CreditCard, DollarSignIcon, Loader2, Tag, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';
import type { AppliedCoupon } from '../types';

type Props = {
  basePrice: number;
  finalPrice: number;
  isFreeEvent: boolean;
  isCasadinha: boolean;
  appliedCoupon: AppliedCoupon | null;
  buying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OrderSummaryModal({ basePrice, finalPrice, isFreeEvent, isCasadinha, appliedCoupon, buying, onCancel, onConfirm }: Props) {
  const isFree = isFreeEvent || finalPrice === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 transition-colors">
      <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border-0 dark:bg-card transition-colors">
        <CardHeader className="bg-transparent border-b border-gray-100 dark:border-slate-800/50 pb-6 text-center transition-colors">
          <CardTitle className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">Resumo do Pedido</CardTitle>
          {!isFree && (
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-2 transition-colors">
              Finalize o pagamento para garantir {isCasadinha ? 'as suas vagas' : 'o seu ingresso'}.
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          <div className="space-y-5 mb-8">
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 transition-colors">
              <span className="font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Ingresso {isCasadinha && '(x2)'}
              </span>
              <span className={`font-semibold text-gray-900 dark:text-gray-100 transition-colors ${appliedCoupon ? 'line-through text-gray-400 dark:text-gray-600 text-sm' : ''}`}>
                {isFreeEvent ? 'Gratuito' : formatBRL(basePrice)}
              </span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 transition-colors">
                <span className="font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Desconto ({appliedCoupon.code})
                </span>
                <span className="font-semibold">
                  - {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatBRL(appliedCoupon.discount_value)}
                </span>
              </div>
            )}

            {!isFree && (
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 transition-colors">
                <span className="font-medium flex items-center gap-2">
                  <DollarSignIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Pagamento
                </span>
                <span className="flex gap-2 items-center justify-center font-semibold text-gray-900 dark:text-gray-100 transition-colors">
                  Pix ou cartão
                  <img src="/pix.svg" className="w-5 h-5 dark:brightness-200" alt="Pix" />
                  <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-label="Cartão de crédito" />
                </span>
              </div>
            )}

            <div className={`pt-5 mt-2 border-t flex justify-between items-center p-4 rounded-2xl transition-colors ${
              isFree
                ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                : 'bg-blue-50/50 border-gray-100 dark:bg-blue-500/10 dark:border-blue-500/20'
            }`}>
              <span className="text-gray-900 dark:text-gray-100 font-bold transition-colors">Total a pagar:</span>
              <div className="text-right flex flex-col items-end">
                {appliedCoupon && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 line-through mb-1">
                    {formatBRL(basePrice)}
                  </span>
                )}
                <span className={`text-3xl font-black tracking-tight transition-colors ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {isFree ? 'Gratuito' : formatBRL(finalPrice)}
                </span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1.5 transition-colors">
              <Clock className="w-3.5 h-3.5" />
              {isFree ? 'Sua vaga será reservada imediatamente.' : 'Após a confirmação, você terá 30 minutos para pagar. No cartão, pode haver juros do parcelamento.'}
            </p>
          </div>

          <div className="flex md:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={buying}
              className="flex-1 h-12 rounded-xl font-bold text-gray-700 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={buying}
              className={`flex-1 h-12 rounded-xl font-bold text-white shadow-md transition-colors ${isFree ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-blue-600/20'}`}
            >
              {buying ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
              ) : (
                'Confirmar Pedido'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
