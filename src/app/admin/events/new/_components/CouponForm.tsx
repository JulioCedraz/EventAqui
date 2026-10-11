'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CouponDraft, DiscountType } from '../types';

type Props = {
  draft: CouponDraft;
  updateDraft: (patch: Partial<CouponDraft>) => void;
  isSaving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function CouponForm({ draft, updateDraft, isSaving, onSubmit, onCancel }: Props) {
  const isPercentage = draft.type === 'percentage';

  return (
    <div className="p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 space-y-5 animate-in fade-in slide-in-from-top-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label>Código do Cupom</Label>
          <Input
            value={draft.code}
            onChange={e => updateDraft({ code: e.target.value.toUpperCase() })}
            placeholder="Ex: CALOURO20"
            className="h-11 rounded-xl uppercase font-bold"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Desconto</Label>
          <select
            value={draft.type}
            onChange={e => updateDraft({ type: e.target.value as DiscountType })}
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="percentage">Porcentagem (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Desconto ({isPercentage ? '%' : 'R$'})</Label>
          <Input
            type="number"
            step={isPercentage ? '1' : '0.01'}
            min="0.01"
            value={draft.value}
            onChange={e => updateDraft({ value: e.target.value })}
            placeholder={isPercentage ? 'Ex: 20' : 'Ex: 20.00'}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Limite de Usos <span className="text-muted-foreground font-normal ml-1">(Opcional)</span></Label>
          <Input
            type="number"
            min="1"
            value={draft.maxUses}
            onChange={e => updateDraft({ maxUses: e.target.value })}
            placeholder="Ex: 50 (Deixe em branco para ilimitado)"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Data de Validade <span className="text-muted-foreground font-normal ml-1">(Opcional)</span></Label>
          <Input
            type="datetime-local"
            value={draft.expires}
            onChange={e => updateDraft({ expires: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 pt-3 border-t border-blue-100/50 dark:border-blue-900/30">
          <label className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={draft.isCasadinhaOnly}
              onChange={(e) => updateDraft({ isCasadinhaOnly: e.target.checked })}
              className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors"
            />
            <span>Válido <strong className="text-blue-600 dark:text-blue-400">exclusivamente</strong> para ingressos Casadinha (Compre 1 Leve 2)</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl h-11 px-6 font-medium">
          Cancelar
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isSaving} className="rounded-xl h-11 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar Cupom'}
        </Button>
      </div>
    </div>
  );
}
