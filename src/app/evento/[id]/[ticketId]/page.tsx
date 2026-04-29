'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Database } from '../../../../types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, AlertCircle, Clock, Copy, 
  CheckCircle2, QrCode, ArrowLeft, Ticket 
} from "lucide-react";

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
  const [ticketQuantity, setTicketQuantity] = useState(1);
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
        .select('*, events(*)')
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

      const eventInfo = Array.isArray(ticketData.events) ? ticketData.events[0] : ticketData.events;
      setEventDetails(eventInfo as Event);
      setTicketQuantity(ticketData.quantity || 1);

      const limitTime = new Date(ticketData.expires_at).getTime();
      const nowTime = new Date().getTime();

      if (nowTime > limitTime) {
        setIsExpired(true);
        await supabase.from('tickets').update({ payment_status: 'cancelled' }).eq('id', ticketId);
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
            supabase.from('tickets').update({ payment_status: 'cancelled' }).eq('id', ticketId);
          } else {
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
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
    } catch (error) {
      toast.error('Erro ao copiar. Por favor, selecione e copie o código manualmente.');
    }
  };

  // VISTA 1: CARREGANDO
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  // VISTA 2: ERRO
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

  // VISTA 3: EXPIRADO
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4 transition-colors">
        <Card className="max-w-md w-full border-red-100 dark:border-red-900/50 dark:bg-card shadow-lg animate-in zoom-in-95 transition-colors">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 transition-colors">
              <Clock className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Código PIX Expirado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 transition-colors">O prazo de 30 minutos para pagamento encerrou e o seu pedido foi cancelado para libertar as vagas.</p>
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

  // VISTA 4: PAGAMENTO ATIVO
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start transition-colors">
      <Card className="max-w-xl w-full border-gray-200 dark:border-border dark:bg-card shadow-xl overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 transition-colors">
        
        <div className="bg-blue-600 dark:bg-blue-900/40 border-b border-transparent dark:border-blue-900/50 p-8 text-center transition-colors">
          <div className="mx-auto w-12 h-12 bg-blue-500/50 dark:bg-blue-500/20 rounded-full flex items-center justify-center mb-4 transition-colors">
            <QrCode className="w-6 h-6 text-white dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white dark:text-blue-50 tracking-tight transition-colors">Finalizar Pagamento</h1>
          <p className="mt-2 font-medium">
            <Link href={`/evento/${eventId}`} className="text-blue-100 dark:text-blue-300 hover:text-white dark:hover:text-blue-100 hover:underline transition-colors flex items-center justify-center gap-1.5">
              <Ticket className="w-4 h-4" />
              {eventDetails?.title}
            </Link>
          </p>
        </div>

        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-border transition-colors">
            <span className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Quantidade: {ticketQuantity}x</span>
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100 transition-colors">
              R$ {((eventDetails?.price || 0) * ticketQuantity).toFixed(2).replace('.', ',')}
            </span>
          </div>

          {pixData && (
            <div className="text-center flex flex-col items-center">
              
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-4 py-2 text-sm font-bold flex items-center gap-2 mb-8 shadow-sm transition-colors">
                <Clock className="w-4 h-4 animate-pulse" /> 
                Vence em: <span className="text-lg ml-1 font-black">{timeLeft}</span>
              </Badge>

              <p className="text-gray-600 dark:text-gray-400 font-medium mb-6 transition-colors">Escaneie o QR Code abaixo com a app do seu banco:</p>
              
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 inline-block transition-colors">
                <img 
                  src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                  alt="QR Code PIX" 
                  className="w-56 h-56 object-contain" 
                />
              </div>
              
              <div className="w-full mb-8 space-y-3 text-left">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1 transition-colors">Ou use o PIX Copia e Cola:</label>
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