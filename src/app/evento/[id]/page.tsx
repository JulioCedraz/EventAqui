'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Database } from '../../../types/database.types';

type Event = Database['public']['Tables']['events']['Row'];

export default function EventDetails() {
  const router = useRouter();
  const urlParams = useParams();
  const id = urlParams?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id) 
        .single();

      if (error) {
        console.error('Error fetching event:', error);
      } else {
        setEvent(data);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  const handleBuy = async () => {
    setBuying(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const newTicket = {
        event_id: event!.id,
        buyer_name: session.user.user_metadata?.full_name || 'Usuário',
        buyer_email: session.user.email!,
        payment_status: 'pending',
        is_used: false
      };

      const { data: createdTicket, error: supabaseError } = await supabase
        .from('tickets')
        .insert(newTicket as any)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      if (!createdTicket) {
        throw new Error('Não foi possível obter os dados do ingresso criado.');
      }

      setMessage({ text: 'A gerar PIX seguro...', type: 'info' });
      
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event!.title,
          price: event!.price,
          email: session.user.email,
          ticketId: createdTicket.id
        })
      });

      const paymentResponse = await res.json();

      if (!res.ok) {
        throw new Error(paymentResponse.erro || 'Falha ao gerar o PIX');
      }

      setPixData(paymentResponse);
      setMessage({ text: 'PIX gerado com sucesso! Realize o pagamento.', type: 'success' });

    } catch (error: any) {
      setMessage({ text: error.message || 'Erro ao processar compra.', type: 'error' });
    } finally {
      setBuying(false);
    }
  };

  const copyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      alert('Código PIX copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-medium">Carregando detalhes do evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Evento não encontrado.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
        
        {event.image_url ? (
          <div className="w-full h-64 md:h-96">
            <img 
              src={event.image_url} 
              alt={`Capa do evento ${event.title}`} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-64 md:h-96 bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl opacity-50">Sem Capa</span>
          </div>
        )}

        <div className="p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{event.title}</h1>
          <p className="text-gray-600 mb-8 whitespace-pre-wrap">{event.description}</p>
          
          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Data e Hora</span>
                <span className="block text-lg text-gray-900 font-semibold">
                  {new Date(event.event_date).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Valor</span>
                <span className="block text-lg text-blue-600 font-bold">
                  R$ {event.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 mb-6 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 
              message.type === 'info' ? 'bg-blue-50 text-blue-800' :
              'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {pixData ? (
            <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pague com PIX</h3>
              <p className="text-gray-600 text-sm mb-6">Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>
              
              <img 
                src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                alt="QR Code PIX Mercado Pago" 
                className="mx-auto w-56 h-56 mb-6 border-4 border-white rounded-lg shadow-sm" 
              />
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Ou copie o código (PIX Copia e Cola):</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={pixData.qr_code} 
                    className="w-full text-sm p-3 border border-gray-300 rounded-lg bg-white text-gray-600 focus:outline-none" 
                  />
                  <button 
                    onClick={copyPix}
                    className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <button 
                onClick={() => router.push('/tickets')}
                className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Ir para Meus Ingressos
              </button>
            </div>
          ) : (
            <button 
              onClick={handleBuy}
              disabled={buying}
              className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex justify-center items-center"
            >
              {buying ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                'Comprar Ingresso'
              )}
            </button>
          )}

        </div>
      </div>
    </main>
  );
}