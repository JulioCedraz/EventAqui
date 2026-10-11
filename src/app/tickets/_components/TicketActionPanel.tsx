'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { ArrowRight, CheckCircle2, Copy, QrCode, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { MyTicket } from '../types';

type Props = {
  ticket: MyTicket;
  onContinuePayment: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

export default function TicketActionPanel({ ticket, onContinuePayment, onCancel, onDelete }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(ticket.id);
      setCopied(true);
      toast.success('Código copiado com sucesso!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar', error);
      toast.error('Erro ao copiar o código.');
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/30 md:w-[320px] flex flex-col justify-center items-center text-center transition-colors z-10">
      {ticket.payment_status === 'approved' && !ticket.is_used && (
        <div className="w-full flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-4 inline-block transition-colors">
            <QRCode value={ticket.id} size={140} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 140 140`} />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 transition-colors">
            <QrCode className="w-3.5 h-3.5" /> Seu QR Code
          </p>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full overflow-hidden shadow-sm transition-colors">
            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate pl-3 py-2 flex-1 select-all text-left transition-colors">
              {ticket.id}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyCode}
              className={`h-full px-3 transition-colors ${copied ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800'}`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {ticket.is_used && (
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-gray-500 dark:text-gray-400 transition-colors" />
          </div>
          <p className="font-bold text-gray-600 dark:text-gray-400 transition-colors">Este ingresso já foi validado na portaria.</p>
        </div>
      )}

      {ticket.payment_status === 'pending' && (
        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={onContinuePayment}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
          >
            Continuar Pagamento <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 font-bold rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4 mr-2" /> Cancelar Pedido
          </Button>
        </div>
      )}

      {ticket.payment_status === 'cancelled' && (
        <Button
          variant="ghost"
          onClick={onDelete}
          className="w-full h-12 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 font-bold rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Excluir do Histórico
        </Button>
      )}
    </div>
  );
}
