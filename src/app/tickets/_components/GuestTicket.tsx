'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Edit3, HelpCircle, Link as LinkIcon, QrCode, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Guest } from '../types';

type Props = {
  guest: Guest;
  onEdit: (guest: Guest) => void;
};

export default function GuestTicket({ guest, onEdit }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyGuestLink = async () => {
    const magicLink = `${window.location.origin}/resgatar/${guest.id}`;
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopiedLink(true);
      toast.success('Link de resgate copiado! Envie para seu convidado.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error('Falha ao copiar o link.');
    }
  };

  return (
    <>
      {/* Divisória Horizontal Rasgada (Separação visual de ingressos) */}
      <div className="relative flex items-center justify-center w-full z-20">
        <div className="absolute left-0 -ml-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-background shadow-inner"></div>
        <div className="w-full h-px border-b-2 border-dashed border-gray-300 dark:border-slate-700"></div>
        <div className="absolute right-0 -mr-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-background shadow-inner"></div>
      </div>

      <div className={`flex flex-col md:flex-row relative z-10 ${guest.is_claimed ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'bg-blue-50/40 dark:bg-blue-950/10'} transition-colors`}>

        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Users className="w-5 h-5 text-blue-500" />
              Ingresso do Convidado
            </h4>
            {guest.is_claimed ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 text-xs">Resgatado</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 px-3 py-1 text-xs">Aguardando Resgate</Badge>
            )}
          </div>

          <div className="mb-6">
            <p className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-gray-100 mb-1">{guest.guest_name}</p>
            <p className="text-base text-gray-600 dark:text-gray-400 font-medium">{guest.guest_email}</p>
          </div>

          {!guest.is_claimed && (
            <div className="flex flex-col xl:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={copyGuestLink}
                className="w-full xl:flex-1 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40 h-12 rounded-xl font-bold"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                Copiar Link de Resgate
              </Button>

              <div className="flex items-stretch gap-2 w-full xl:flex-1">
                <Button
                  variant="ghost"
                  disabled={guest.has_been_edited}
                  onClick={() => onEdit(guest)}
                  className="flex-1 h-12 text-gray-600 hover:text-blue-700 hover:bg-blue-100 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-xl font-bold"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {guest.has_been_edited ? 'Dados Editados' : 'Editar Dados'}
                </Button>

                <div className="relative group flex items-center justify-center shrink-0">
                  <button type="button" className="h-12 w-12 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none" aria-label="Informação sobre edição">
                    <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" />
                  </button>

                  <div className="hidden group-hover:block group-focus-within:block absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-100 text-xs text-gray-100 dark:text-gray-800 text-center rounded-xl shadow-xl z-20 before:content-[''] before:absolute before:top-full before:right-4 sm:before:left-1/2 sm:before:right-auto sm:before:-translate-x-1/2 before:border-6 before:border-transparent before:border-t-gray-900 dark:before:border-t-gray-100">
                    <strong className="block mb-1">Atenção!</strong>
                    Os dados do convidado poderão ser alterados <b>uma única vez</b> enquanto o ingresso não for resgatado.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divisória tracejada vertical do Convidado (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center relative">
          <div className="w-px h-full border-r-2 border-dashed border-gray-300 dark:border-slate-700 transition-colors"></div>
        </div>

        {/* Divisória tracejada vertical (Mobile) */}
        <div className="md:hidden h-px border-b-2 border-dashed border-gray-300 dark:border-slate-700 mx-6"></div>

        <div className="p-6 md:p-8 md:w-[320px] flex flex-col justify-center items-center text-center transition-colors">
          {guest.is_claimed ? (
            <div className="w-full flex flex-col items-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4 transition-colors shadow-inner border-4 border-white dark:border-slate-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-black text-gray-800 dark:text-gray-200 mb-1">
                Resgatado!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 px-4 leading-relaxed">
                O QR Code definitivo já está disponível na conta do seu convidado.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center opacity-80">
              <div className="w-36 h-36 bg-white/50 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-gray-300 dark:border-slate-600 transition-colors shadow-sm">
                <QrCode className="w-14 h-14 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 transition-colors">
                <Clock className="w-4 h-4" /> Aguardando
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors px-2 leading-relaxed font-medium">
                O QR Code de entrada será gerado assim que o seu convidado acessar o link e criar a conta.
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
