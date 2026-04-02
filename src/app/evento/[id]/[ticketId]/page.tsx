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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // VISTA 2: ERRO
  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full border-red-100 shadow-lg animate-in zoom-in-95">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Ocorreu um erro.</h2>
            <p className="text-gray-600 mb-8">{errorMsg}</p>
            <Button 
              onClick={() => router.push('/tickets')} 
              className="w-full h-12 text-base font-bold rounded-xl"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full border-red-100 shadow-lg animate-in zoom-in-95">
          <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Código PIX Expirado</h2>
            <p className="text-gray-600 mb-8">O prazo de 30 minutos para pagamento encerrou e o seu pedido foi cancelado para libertar as vagas.</p>
            <Button 
              onClick={() => router.push(`/evento/${eventId}`)} 
              className="w-full h-12 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700"
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
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <Card className="max-w-xl w-full border-gray-200 shadow-xl overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4">
        
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500/50 rounded-full flex items-center justify-center mb-4">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Finalizar Pagamento</h1>
          <p className="mt-2 font-medium">
            <Link href={`/evento/${eventId}`} className="text-blue-100 hover:text-white hover:underline transition-colors flex items-center justify-center gap-1.5">
              <Ticket className="w-4 h-4" />
              {eventDetails?.title}
            </Link>
          </p>
        </div>

        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Quantidade: {ticketQuantity}x</span>
            <span className="text-3xl font-black text-gray-900">
              R$ {((eventDetails?.price || 0) * ticketQuantity).toFixed(2).replace('.', ',')}
            </span>
          </div>

          {pixData && (
            <div className="text-center flex flex-col items-center">
              
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 px-4 py-2 text-sm font-bold flex items-center gap-2 mb-8 shadow-sm">
                <Clock className="w-4 h-4 animate-pulse" /> 
                Vence em: <span className="text-lg ml-1 font-black">{timeLeft}</span>
              </Badge>

              <p className="text-gray-600 font-medium mb-6">Escaneie o QR Code abaixo com a app do seu banco:</p>
              
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 inline-block">
                <img 
                  src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                  alt="QR Code PIX" 
                  className="w-56 h-56 object-contain" 
                />
              </div>
              
              <div className="w-full mb-8 space-y-3 text-left">
                <label className="text-sm font-bold text-gray-700 ml-1">Ou use o PIX Copia e Cola:</label>
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    readOnly 
                    value={pixData.qr_code} 
                    className="font-mono text-xs bg-gray-50 h-12 rounded-xl focus-visible:ring-blue-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button 
                    type="button"
                    onClick={copyPix}
                    className={`h-12 px-6 rounded-xl font-bold transition-all shrink-0 shadow-sm ${
                      copiedPix ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {copiedPix ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <div className="w-full pt-6 border-t border-gray-100">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/tickets')} 
                  className="w-full h-12 rounded-xl font-bold text-gray-700"
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