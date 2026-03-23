'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Database } from '../../../../types/database.types';

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
        setErrorMsg('Erro interno: A validade deste ingresso não foi registrada corretamente no sistema. Por favor, cancele e tente novamente.');
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
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pixData.qr_code); alert('Código PIX copiado!');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixData.qr_code; textArea.style.position = "absolute"; textArea.style.left = "-999999px";
        document.body.prepend(textArea); textArea.select();
        try { document.execCommand('copy'); alert('Código PIX copiado!'); } 
        finally { textArea.remove(); }
      }
    } catch (error) { alert('Erro ao copiar.'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Ocorreu um erro.</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button onClick={() => router.push('/tickets')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">
            Ir para Meus Ingressos
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Código PIX Expirado</h2>
          <p className="text-gray-600 mb-6">O prazo de 30 minutos para pagamento encerrou e o seu pedido foi cancelado para libertar os ingressos.</p>
          <button onClick={() => router.push(`/evento/${eventId}`)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">
            Fazer Nova Compra
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-extrabold text-white">Finalizar Pagamento</h1>
          <p className="mt-1">
            <Link href={`/evento/${eventId}`} className="text-blue-100 hover:text-white hover:underline transition-colors">
              {eventDetails?.title}
            </Link>
          </p>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Quantidade: {ticketQuantity}x</span>
            <span className="text-2xl font-black text-gray-900">
              R$ {((eventDetails?.price || 0) * ticketQuantity).toFixed(2).replace('.', ',')}
            </span>
          </div>

          {pixData && (
            <div className="text-center animate-in fade-in">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg font-bold text-sm inline-block mb-6 shadow-sm">
                Vence em: <span className="text-xl ml-1">{timeLeft}</span>
              </div>

              <p className="text-gray-600 text-sm mb-6">Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>
              
              <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="mx-auto w-56 h-56 mb-6 border-4 border-gray-50 rounded-2xl shadow-sm" />
              
              <div className="mb-8">
                <p className="text-sm font-medium text-gray-700 mb-2">Ou copie o código (PIX Copia e Cola):</p>
                <div className="flex gap-2">
                  <input type="text" readOnly value={pixData.qr_code} className="w-full text-sm p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 focus:outline-none" />
                  <button onClick={copyPix} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => router.push('/tickets')} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}