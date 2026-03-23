'use client';

import { useState, useEffect, useCallback } from 'react';
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
  
  const [quantity, setQuantity] = useState<number | string>(1);
  const [pendingTicket, setPendingTicket] = useState<any | null>(null);
  
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);

  const fetchEventAndStatus = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id) 
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: pendingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('event_id', id)
          .eq('buyer_email', session.user.email)
          .eq('payment_status', 'pending')
          .maybeSingle(); 
        
        setPendingTicket(pendingData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEventAndStatus();
  }, [fetchEventAndStatus]);

  const handleCancelPending = async () => {
    if (!pendingTicket) return;
    
    const isConfirmed = window.confirm('Tem certeza que deseja cancelar o seu pedido pendente?');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: 'cancelled' })
        .eq('id', pendingTicket.id);

      if (error) throw error;
      
      alert('Pedido cancelado com sucesso! Agora você pode fazer uma nova compra.');
      setPendingTicket(null); 
      setQuantity(1); 
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      alert('Erro ao cancelar o pedido. Tente novamente.');
    }
  };

  const handleBuy = async () => {
    setBuying(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const validQuantity = Number(quantity) || 1;
      const totalPrice = event!.price * validQuantity;

      const newTicket = {
        event_id: event!.id,
        buyer_name: session.user.user_metadata?.full_name || 'Usuário',
        buyer_email: session.user.email!,
        payment_status: 'pending',
        quantity: validQuantity,
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
          title: `${event!.title} (${validQuantity}x)`, 
          price: totalPrice,
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
      setPendingTicket(createdTicket);

    } catch (error: any) {
      setMessage({ text: error.message || 'Erro ao processar compra.', type: 'error' });
    } finally {
      setBuying(false);
    }
  };

  const copyPix = async () => {
    if (!pixData?.qr_code) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pixData.qr_code);
        alert('Código PIX copiado!');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixData.qr_code;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          alert('Código PIX copiado!');
        } catch (fallbackError) {
          console.error('Erro no fallback de cópia:', fallbackError);
          alert('O seu navegador bloqueou a cópia automática. Por favor, selecione e copie o código manualmente.');
        } finally {
          textArea.remove();
        }
      }
    } catch (error) {
      console.error('Falha ao copiar PIX:', error);
      alert('Erro ao copiar. Tente novamente.');
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
                <span className="block text-sm font-medium text-gray-500 mb-1">Valor Unitário</span>
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
            <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center animate-in fade-in">
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
          ) : pendingTicket ? (
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-center animate-in fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-yellow-900 mb-2">Você tem um pedido pendente!</h3>
              <p className="text-yellow-700 mb-6">
                Identificamos que você já iniciou a compra de <strong>{pendingTicket.quantity || 1} ingresso(s)</strong> para este evento e o pagamento aguarda confirmação.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleCancelPending}
                  className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-colors w-full sm:w-auto"
                >
                  Cancelar Pedido
                </button>
                <button 
                  onClick={() => router.push(`/evento/${event.id}/${pendingTicket.id}`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                >
                  Continuar Pagamento
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                <span className="font-semibold text-gray-700">Quantidade:</span>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, Number(q) - 1))}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xl shrink-0"
                  >
                    -
                  </button>
                  
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity('');
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setQuantity(Math.min(10, num));
                        }
                      }
                    }}
                    onBlur={() => {
                      if (quantity === '' || Number(quantity) < 1) {
                        setQuantity(1);
                      }
                    }}
                    className="w-12 text-xl font-bold text-gray-900 text-center bg-transparent border-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button 
                    onClick={() => setQuantity(q => Math.min(10, Number(q) + 1))} 
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xl shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-gray-900 mb-2 px-2">
                <span className="font-medium text-gray-500">Total a pagar:</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  R$ {(event.price * (Number(quantity) || 1)).toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button 
                onClick={handleBuy}
                disabled={buying}
                className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex justify-center items-center shadow-md"
              >
                {buying ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  'Comprar Agora'
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}