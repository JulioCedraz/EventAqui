'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { cancelTicket } from '@/lib/api-client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Database } from '../../../../types/database.types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Loader2, AlertCircle, Clock, Copy,
  CheckCircle2, QrCode, Ticket, Tag,
  Receipt, User, Calendar, ArrowLeft
} from "lucide-react";
import type { TicketWithEvent } from '@/types/tickets';

type Event = Database['public']['Tables']['events']['Row'];

export default function ResumePaymentPage() {
  const router = useRouter();
  const params = useParams();
  
  const eventId = params?.id as string;
  const ticketId = params?.ticketId as string;

  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [ticketDetails, setTicketDetails] = useState<TicketWithEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('Calculando...');
  const [isExpired, setIsExpired] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const loadCheckout = async () => {
      if (!eventId || !ticketId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*, events(*), coupons(code, discount_type, discount_value)')
        .eq('id', ticketId)
        .eq('buyer_email', session.user.email)
        .single();

      if (ticketError || !ticketData) {
        setErrorMsg('Ingresso não encontrado ou acesso negado.');
        setLoading(false);
        return;
      }

      if (ticketData.payment_status === 'approved') {
        router.push('/tickets');
        return;
      }

      if (!ticketData.expires_at) {
        setErrorMsg('Erro interno: A validade deste ingresso não foi registrada corretamente. Por favor, cancele e tente novamente.');
        setLoading(false);
        return;
      }

      setEventDetails(ticketData.events as Event);
      setTicketDetails(ticketData);

      const limitTime = new Date(ticketData.expires_at).getTime();
      const nowTime = new Date().getTime();

      if (nowTime > limitTime) {
        setIsExpired(true);
        await cancelTicket(ticketId).catch((error) => console.error('Falha ao cancelar PIX expirado:', error));
        setLoading(false);
      } else {
        setPixData({
          qr_code: ticketData.pix_qr_code || '',
          qr_code_base64: ticketData.pix_qr_code_base64 || ''
        });

        intervalId = setInterval(() => {
          const currentNow = new Date().getTime();
          const distance = limitTime - currentNow;

          if (distance <= 0) {
            clearInterval(intervalId);
            setIsExpired(true);
            cancelTicket(ticketId).catch((error) => console.error('Falha ao cancelar PIX expirado:', error));
          } else {
            const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
            setTimeLeft(`${minutes}m ${seconds}s`);
          }
        }, 1000);
        
        setLoading(false);
      }
    };

    loadCheckout();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [eventId, ticketId, router]);

  const copyPix = async () => {
    if (!pixData?.qr_code) return;

    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopiedPix(true);
      toast.success('Código PIX copiado com sucesso!');
      
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      toast.error('Erro ao copiar. Por favor, selecione e copie o código manualmente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4 transition-colors">
        <Card className="max-w-md w-full border-red-100 dark:border-red-900/50 dark:bg-card shadow-lg animate-in zoom-in-95 transition-colors">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 transition-colors">
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Ops! Ocorreu um erro.</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 transition-colors">{errorMsg}</p>
            <Button 
              onClick={() => router.push('/tickets')} 
              className="w-full h-12 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-white"
            >
              Ir para Meus Ingressos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4 transition-colors">
        <Card className="max-w-md w-full border-red-100 dark:border-red-900/50 dark:bg-card shadow-lg animate-in zoom-in-95 transition-colors">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 transition-colors">
              <Clock className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Código PIX Expirado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 transition-colors">O prazo de 30 minutos para pagamento encerrou e o seu pedido foi cancelado. Para garantir o seu ingresso, faça um novo pedido.</p>
            <Button 
              onClick={() => router.push(`/evento/${eventId}`)} 
              className="w-full h-12 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
            >
              Fazer Nova Compra
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basePrice = (eventDetails?.price || 0) * (ticketDetails?.quantity || 1);
  const hasCoupon = !!ticketDetails?.coupons;
  
  let finalPrice = basePrice;
  if (hasCoupon) {
    if (ticketDetails.coupons.discount_type === 'percentage') {
      finalPrice -= finalPrice * (ticketDetails.coupons.discount_value / 100);
    } else {
      finalPrice -= ticketDetails.coupons.discount_value;
    }
    finalPrice = Math.max(0, finalPrice);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start transition-colors">
      <Card className="max-w-xl w-full border-gray-200 dark:border-border dark:bg-card shadow-xl overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 transition-colors">
        
        <div className="bg-blue-600 dark:bg-blue-900/40 border-b border-transparent dark:border-blue-900/50 p-8 text-center transition-colors">
          <div className="mx-auto w-12 h-12 bg-blue-500/50 dark:bg-blue-500/20 rounded-full flex items-center justify-center mb-4 transition-colors shadow-inner">
            <QrCode className="w-6 h-6 text-white dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white dark:text-blue-50 tracking-tight transition-colors mb-2">Pagamento pendente</h1>
          <Link href={`/evento/${eventId}`} className="inline-flex items-center justify-center gap-1.5 text-blue-100 dark:text-blue-300 hover:text-white dark:hover:text-blue-100 hover:underline transition-colors font-medium">
            <Ticket className="w-4 h-4" />
            {eventDetails?.title}
          </Link>
          <div className="flex items-center justify-center gap-1.5 text-blue-200/80 dark:text-blue-400/80 text-sm mt-2">
            <Calendar className="w-3.5 h-3.5" />
            {eventDetails?.event_date ? new Date(eventDetails.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
          </div>
        </div>

        <CardContent className="p-6 md:p-8">
          
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 mb-8 shadow-sm transition-colors">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 animate-pulse shrink-0" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-400 text-sm mb-0.5 transition-colors">Seu ingresso está reservado!</p>
              <p className="text-sm text-amber-700 dark:text-amber-500 transition-colors">
                Realize o pagamento em até <strong className="font-black">{timeLeft}</strong> para garantir sua vaga.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 mb-8 transition-colors">
            <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Resumo do Pedido
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><User className="w-4 h-4" /> Titular</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-50">{ticketDetails?.buyer_name}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" /> 
                  {ticketDetails?.quantity === 2 ? 'Casadinha' : 'Ingresso Individual'}
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">R$ {basePrice.toFixed(2).replace('.', ',')}</span>
              </div>

              {hasCoupon && (
                <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5 font-medium"><Tag className="w-4 h-4" /> Desconto ({ticketDetails.coupons.code})</span>
                  <span className="font-bold">
                    - {ticketDetails.coupons.discount_type === 'percentage' ? `${ticketDetails.coupons.discount_value}%` : `R$ ${ticketDetails.coupons.discount_value.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-slate-700/50 flex justify-between items-center">
              <span className="font-bold text-gray-900 dark:text-gray-100 transition-colors">Total a pagar:</span>
              <div className="text-right">
                {hasCoupon && (
                  <span className="block text-xs text-gray-400 dark:text-gray-500 line-through mb-0.5">
                    R$ {basePrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight transition-colors">
                  R$ {finalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {pixData && (
            <div className="text-center flex flex-col items-center">
              
              <div className="w-full text-left mb-4">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 transition-colors">Pix QR Code</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">Pegue o seu celular, acesse o aplicativo do seu banco, toque em Pix, depois em Ler QR Code:</p>
              </div>
              
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 inline-block transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR Code em data URL */}
                <img 
                  src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain" 
                />
              </div>
              
              <div className="w-full mb-8 text-left">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 transition-colors">PIX Copia e Cola</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 transition-colors">Está no celular? Copie o código abaixo, acesse o aplicativo do seu banco, e cole na área de pagamento Pix Copia e Cola.</p>
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    readOnly 
                    value={pixData.qr_code} 
                    className="font-mono text-xs bg-gray-50 dark:bg-slate-900 dark:border-slate-700/50 dark:text-gray-300 h-12 rounded-xl focus-visible:ring-blue-500 transition-colors"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button 
                    type="button"
                    onClick={copyPix}
                    className={`h-12 px-6 rounded-xl font-bold transition-all shrink-0 shadow-sm ${
                      copiedPix ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-900 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    {copiedPix ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <div className="w-full pt-6 border-t border-gray-100 dark:border-border transition-colors">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/tickets')} 
                  className="w-full h-12 rounded-xl font-bold text-gray-700 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para Meus Ingressos
                </Button>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}