'use client';

import { Loader2, Shield, Tag, User, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/utils';
import type { AppliedCoupon, GuestData } from '../types';

type CouponProps = {
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  appliedCoupon: AppliedCoupon | null;
  isApplyingCoupon: boolean;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
};

type Props = CouponProps & {
  availableSpots: number | null;
  isFreeEvent: boolean;
  isCasadinha: boolean;
  onTicketTypeChange: (isCasadinha: boolean) => void;
  guest: GuestData;
  onGuestChange: (guest: GuestData) => void;
  basePrice: number;
  finalPrice: number;
  buying: boolean;
  onBuy: () => void;
};

const toggleClass = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
    active
      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
  }`;

function GuestForm({ guest, onChange }: { guest: GuestData; onChange: (guest: GuestData) => void }) {
  const field = (key: keyof GuestData) => ({
    value: guest[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...guest, [key]: e.target.value }),
  });

  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4 transition-colors">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-blue-500" />
        Dados do Convidado
      </h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="guestName">Nome Completo *</Label>
          <Input id="guestName" placeholder="Digite o nome completo" {...field('name')} className="mt-1 h-12 rounded-xl bg-gray-50 dark:bg-slate-900" />
        </div>
        <div>
          <Label htmlFor="guestEmail">E-mail *</Label>
          <Input id="guestEmail" type="email" placeholder="E-mail que receberá o ingresso" {...field('email')} className="mt-1 h-12 rounded-xl bg-gray-50 dark:bg-slate-900" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guestCpf">CPF *</Label>
            <Input id="guestCpf" placeholder="000.000.000-00" {...field('cpf')} className="mt-1 h-12 rounded-xl bg-gray-50 dark:bg-slate-900" />
          </div>
          <div>
            <Label htmlFor="guestPhone">Telefone (Opcional)</Label>
            <Input id="guestPhone" placeholder="(00) 00000-0000" {...field('phone')} className="mt-1 h-12 rounded-xl bg-gray-50 dark:bg-slate-900" />
            <p className="text-[10px] text-gray-500 mt-1 ml-1 leading-tight">Usado apenas caso haja problemas com o e-mail.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponField({ couponInput, onCouponInputChange, appliedCoupon, isApplyingCoupon, onApplyCoupon, onRemoveCoupon }: CouponProps) {
  return (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
      {appliedCoupon ? (
        <div className="flex items-center justify-between animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100 tracking-wide">{appliedCoupon.code}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Cupom aplicado com sucesso!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemoveCoupon} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10">
            Remover
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={couponInput}
            onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
            placeholder="Possui um cupom de desconto?"
            className="h-12 rounded-xl uppercase placeholder:normal-case font-medium"
          />
          <Button
            disabled={!couponInput.trim() || isApplyingCoupon}
            onClick={onApplyCoupon}
            className="h-12 rounded-xl px-6 bg-gray-900 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold w-full sm:w-auto shrink-0"
          >
            {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PurchasePanel(props: Props) {
  const { availableSpots, isFreeEvent, isCasadinha, onTicketTypeChange, guest, onGuestChange, basePrice, finalPrice, buying, onBuy, appliedCoupon } = props;
  const isFree = isFreeEvent || finalPrice === 0;

  return (
    <div className="space-y-6 max-w-md mx-auto md:max-w-none md:mx-0">
      {availableSpots !== null && availableSpots <= 5 && (
        <Badge variant="destructive" className="w-full justify-center text-sm py-2.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold animate-pulse rounded-xl transition-colors">
          Corra! Restam apenas {availableSpots} vaga(s) disponível(is).
        </Badge>
      )}

      <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
        <button type="button" onClick={() => onTicketTypeChange(false)} className={toggleClass(!isCasadinha)}>
          <User className="w-4 h-4" />
          Individual
        </button>
        <button type="button" onClick={() => onTicketTypeChange(true)} className={toggleClass(isCasadinha)}>
          <Users className="w-4 h-4" />
          Casadinha
        </button>
      </div>

      {isCasadinha && <GuestForm guest={guest} onChange={onGuestChange} />}

      {!isFreeEvent && <CouponField {...props} />}

      <div className={`flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 p-6 rounded-2xl border transition-colors ${
        isFree
          ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'
          : 'bg-blue-50/50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20'
      }`}>
        <span className="font-bold text-gray-500 dark:text-gray-400 text-lg transition-colors text-center md:text-left">
          Total a pagar:
        </span>
        <div className="flex flex-col items-center text-center md:items-end md:text-right">
          {appliedCoupon && (
            <span className="text-sm text-gray-400 dark:text-gray-500 line-through mb-1 animate-in slide-in-from-right-4">
              {formatBRL(basePrice)}
            </span>
          )}
          <span className={`text-4xl font-black tracking-tight transition-colors ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {isFree ? 'Gratuito' : formatBRL(finalPrice)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors">
        <Shield className="w-6 h-6 text-slate-400 shrink-0" />
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-300">Ingresso nominal e intransferível.</strong> Vinculado ao CPF e e-mail do titular da conta cadastrada.
        </p>
      </div>

      <Button
        size="lg"
        onClick={onBuy}
        disabled={buying}
        className={`w-full h-16 text-white font-black text-xl rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${
          isFree
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 dark:bg-emerald-600 dark:hover:bg-emerald-700'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 dark:bg-blue-600 dark:hover:bg-blue-700'
        }`}
      >
        {isCasadinha ? 'Garantir os ingressos' : 'Garantir o meu ingresso'}
      </Button>
    </div>
  );
}
