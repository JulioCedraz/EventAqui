import Link from 'next/link';
import { Calendar, Clock, Receipt, User, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import TicketActionPanel from './TicketActionPanel';
import GuestTicket from './GuestTicket';
import type { Guest, MyTicket } from '../types';

type Props = {
  ticket: MyTicket;
  onContinuePayment: (ticket: MyTicket) => void;
  onCancel: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
  onEditGuest: (guest: Guest) => void;
};

function calculateFinalPrice(ticket: MyTicket, basePrice: number) {
  if (!ticket.coupons) return basePrice;

  if (ticket.coupons.discount_type === 'percentage') {
    return Math.max(0, basePrice - basePrice * (ticket.coupons.discount_value / 100));
  }

  // Se for herdado da casadinha, divide o desconto fixo visualmente
  const discount = ticket.isInheritedCoupon ? ticket.coupons.discount_value / 2 : ticket.coupons.discount_value;
  return Math.max(0, basePrice - discount);
}

function StatusBadge({ ticket }: { ticket: MyTicket }) {
  if (ticket.payment_status === 'approved' && !ticket.is_used) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 font-bold transition-colors w-fit">Pago / Confirmado</Badge>;
  }
  if (ticket.payment_status === 'approved' && ticket.is_used) {
    return <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700 transition-colors w-fit">Ingresso Utilizado</Badge>;
  }
  if (ticket.payment_status === 'pending') {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold animate-pulse transition-colors w-fit">Aguardando Pagamento</Badge>;
  }
  if (ticket.payment_status === 'cancelled') {
    return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold transition-colors w-fit">Cancelado</Badge>;
  }
  return null;
}

export default function TicketCard({ ticket, onContinuePayment, onCancel, onDelete, onEditGuest }: Props) {
  const basePrice = (ticket.events?.price || 0) * (ticket.quantity || 1);
  const finalPrice = calculateFinalPrice(ticket, basePrice);
  const guest = ticket.guests?.[0] ?? null;
  const isCasadinha = ticket.quantity === 2;

  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card transition-all flex flex-col">

      {/* Ingresso do titular */}
      <div className="flex flex-col md:flex-row h-full relative">

        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between z-10">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <StatusBadge ticket={ticket} />

              {ticket.payment_status === 'pending' && ticket.expires_at && (
                <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Pague até às {new Date(ticket.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <Link href={`/evento/${ticket.event_id}`} className="block hover:opacity-80 transition-opacity">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 leading-tight transition-colors">
                {ticket.events?.title}
              </h2>
            </Link>

            <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium text-sm transition-colors mb-4">
              <Calendar className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
              {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
            </div>
          </div>

          <div className="space-y-4 mt-auto z-10">
            <div className="bg-gray-50/80 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 transition-colors">
              <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Detalhes do Pedido {isCasadinha && '(Pacote Casadinha)'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5"><User className="w-3 h-3" /> Titular {isCasadinha && '(Comprador)'}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">{ticket.buyer_name}</span>
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                    <Wallet className="w-3 h-3" /> Valor Total
                    {ticket.coupons?.code && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-500/30">
                        {ticket.coupons.code}
                      </span>
                    )}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    {ticket.coupons && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                        {formatBRL(basePrice)}
                      </span>
                    )}
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {finalPrice === 0 ? 'Gratuito' : formatBRL(finalPrice)}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2 pt-2 mt-1 border-t border-gray-200/60 dark:border-slate-700/50">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">Emitido em</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {new Date(ticket.created_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divisória tracejada vertical do Titular (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center relative z-0">
          {!isCasadinha && (
            <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -top-3 shadow-inner transition-colors z-10"></div>
          )}
          <div className="w-px h-full border-r-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors"></div>
          {!isCasadinha && (
            <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -bottom-3 shadow-inner transition-colors z-10"></div>
          )}
        </div>

        {/* Divisória tracejada vertical (Mobile) */}
        <div className="md:hidden h-px border-b-2 border-dashed border-gray-200 dark:border-slate-800 mx-6"></div>

        <TicketActionPanel
          ticket={ticket}
          onContinuePayment={() => onContinuePayment(ticket)}
          onCancel={() => onCancel(ticket.id)}
          onDelete={() => onDelete(ticket.id)}
        />
      </div>

      {/* Ingresso do convidado (casadinha) */}
      {isCasadinha && guest && ticket.payment_status !== 'cancelled' && (
        <GuestTicket guest={guest} onEdit={onEditGuest} />
      )}
    </Card>
  );
}
