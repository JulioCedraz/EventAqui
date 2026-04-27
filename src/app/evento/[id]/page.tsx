// src\app\evento\[id]\page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Database } from '../../../types/database.types';
import SmartModal, { DialogConfig } from '../../../components/SmartModal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Calendar, Clock, CreditCard, Copy, 
  CheckCircle2, QrCode, Ticket, AlertTriangle, 
  Image as ImageIcon, Plus, Minus, Info
} from "lucide-react";

type Event = Database['public']['Tables']['events']['Row'];

export default function EventDetails() {
  const router = useRouter();
  const urlParams = useParams();
  const id = urlParams?.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [pendingTicket, setPendingTicket] = useState<any | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [soldTickets, setSoldTickets] = useState(0);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  
  const fetchEventAndStatus = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', id).single();
      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('quantity')
        .eq('event_id', id)
        .in('payment_status', ['approved', 'pending']);
      
      if (ticketsData) {
        const count = ticketsData.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
        setSoldTickets(count);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: pendingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('event_id', id)
          .eq('buyer_email', session.user.email)
          .eq('payment_status', 'pending')
          .maybeSingle(); 
        
        if (pendingData) {
          if (pendingData.expires_at && new Date(pendingData.expires_at) < new Date()) {
            await supabase.from('tickets').update({ payment_status: 'cancelled' }).eq('id', pendingData.id);
            setPendingTicket(null);
          } else {
            setPendingTicket(pendingData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar detalhes do evento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEventAndStatus();
  }, [fetchEventAndStatus]);

  const promptCancelPending = () => {
    if (!pendingTicket) return;
    
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Cancelar Pedido',
      message: 'Tem certeza que deseja cancelar o seu pedido pendente? Você poderá refazer a compra depois se ainda houver vagas.',
      confirmText: 'Sim, cancelar',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          const { error } = await supabase
            .from('tickets')
            .update({ payment_status: 'cancelled' })
            .eq('id', pendingTicket.id);

          if (error) throw error;
          
          setPendingTicket(null); 
          setQuantity(1);
          fetchEventAndStatus();
          toast.success('Pedido cancelado com sucesso.');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao cancelar:', error);
          toast.error('Erro ao cancelar o pedido. Tente novamente.');
        } finally {
          setIsModalProcessing(false);
        }
      }
    });
  };

  const handleBuy = async () => {
    setBuying(true);
    const isFree = event!.price === 0;
    const toastId = toast.loading(isFree ? 'Garantindo sua vaga...' : 'Gerando PIX seguro e reservando a sua vaga...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        toast.dismiss(toastId);
        router.push('/login'); 
        return; 
      }

      const validQuantity = Number(quantity) || 1;
      const totalPrice = event!.price * validQuantity;

      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + 30);
      const isoExpiration = expirationDate.toISOString();

      const newTicket = {
        event_id: event!.id,
        user_id: session.user.id,
        buyer_name: session.user.user_metadata?.first_name 
          ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name || ''}`.trim()
          : (session.user.user_metadata?.full_name || 'Usuário'),
        buyer_email: session.user.email!,
        payment_status: 'pending',
        quantity: validQuantity,
        is_used: false,
        expires_at: isoExpiration
      };

      const { data: createdTicket, error: supabaseError } = await supabase.from('tickets').insert(newTicket).select().single();
      
      if (supabaseError || !createdTicket) {
        throw new Error('Erro ao registrar o ingresso no banco de dados.');
      }
      
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${event!.title} (${validQuantity}x)`, 
          price: totalPrice,
          email: session.user.email,
          ticketId: createdTicket.id,
          expires_at: isoExpiration
        })
      });

      const paymentResponse = await res.json();
      if (!res.ok) throw new Error(paymentResponse.erro || 'Falha ao processar o pedido');

      // ==========================================
      // LÓGICA DE APROVAÇÃO PARA EVENTOS GRATUITOS
      // ==========================================
      if (paymentResponse.is_free) {
        const { error: updateFreeError } = await supabase.from('tickets').update({
          payment_status: 'approved'
        }).eq('id', createdTicket.id);

        if (updateFreeError) console.error("ALERTA: Falha ao aprovar ingresso gratuito:", updateFreeError);

        toast.success('Inscrição confirmada com sucesso!', { id: toastId });
        setShowConfirmModal(false);
        router.push('/tickets');
        return;
      }

      // ==========================================
      // LÓGICA PIX PARA EVENTOS PAGOS
      // ==========================================
      const { error: updateError } = await supabase.from('tickets').update({
        pix_qr_code: paymentResponse.qr_code,
        pix_qr_code_base64: paymentResponse.qr_code_base64
      }).eq('id', createdTicket.id);

      if (updateError) {
        console.error("ALERTA: Falha ao salvar o QR Code no banco:", updateError);
      }

      setPixData(paymentResponse);
      setPendingTicket({ ...createdTicket, expires_at: isoExpiration });
      setShowConfirmModal(false);
      
      toast.success('PIX gerado! Realize o pagamento em até 30 minutos.', { id: toastId });

    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar requisição.', { id: toastId });
      setShowConfirmModal(false);
    } finally {
      setBuying(false);
    }
  };

  const copyPix = async () => {
    if (!pixData?.qr_code) return;

    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopiedPix(true);
      toast.success('Código PIX copiado com sucesso!');
      setTimeout(() => setCopiedPix(false), 2000);
    } catch (error) {
      console.error('Falha ao copiar PIX:', error);
      toast.error('Não foi possível copiar o código automaticamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-500 font-medium">Carregando detalhes do evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full py-12 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Evento não encontrado</h2>
          <p className="text-gray-500 mt-2">O evento que procura não existe ou foi removido.</p>
          <Button onClick={() => router.push('/')} className="mt-6 font-bold" variant="outline">
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  const isSoldOut = event.total_spots !== null && soldTickets >= event.total_spots;
  const availableSpots = event.total_spots !== null ? Math.max(0, event.total_spots - soldTickets) : null;
  const maxSelectable = availableSpots !== null ? Math.min(10, availableSpots) : 10;
  const isFreeEvent = event.price === 0;

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">

      <SmartModal 
        dialog={dialog} 
        onClose={() => setDialog(null)} 
        isProcessing={isModalProcessing} 
      />

      {/* MODAL DE RESUMO DO PEDIDO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border-0">
            <CardHeader className="bg-gray-50 border-b border-gray-100 pb-6 text-center">
              <CardTitle className="text-2xl font-extrabold text-gray-900">Resumo do Pedido</CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-blue-500" />
                    Ingresso ({quantity}x)
                  </span>
                  <span className="font-semibold text-gray-900">
                    {isFreeEvent ? 'Gratuito' : `R$ ${event.price.toFixed(2).replace('.', ',')} / cada`}
                  </span>
                </div>
                
                {/* Oculta a linha "Pagamento via PIX" se for gratuito */}
                {!isFreeEvent && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      Pagamento
                    </span>
                    <span className="flex gap-2 items-center justify-center font-semibold text-gray-900">
                      Pix
                      <img src="/pix.svg" className="w-5 h-5" alt="Pix" />
                    </span>
                  </div>
                )}
                
                <div className={`pt-5 mt-2 border-t border-gray-100 flex justify-between items-center p-4 rounded-2xl ${isFreeEvent ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50/50'}`}>
                  <span className="text-gray-900 font-bold">Total a pagar:</span>
                  <span className={`text-3xl font-black tracking-tight ${isFreeEvent ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isFreeEvent ? 'Gratuito' : `R$ ${(event.price * (Number(quantity) || 1)).toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
                
                <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {isFreeEvent ? 'Sua vaga será reservada imediatamente.' : 'O código PIX será gerado na próxima tela.'}
                </p>
              </div>

              <div className="flex sm:flex-row gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={buying}
                  className="flex-1 h-12 rounded-xl font-bold text-gray-700"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleBuy}
                  disabled={buying}
                  className={`flex-1 h-12 rounded-xl font-bold text-white shadow-md ${isFreeEvent ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                >
                  {buying ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL DA PÁGINA */}
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-3xl shadow-lg overflow-hidden border-0 bg-white">
          
          {/* CAPA DO EVENTO */}
          {event.image_url ? (
            <div className="w-full h-64 md:h-100 relative">
              <img 
                src={event.image_url} 
                alt={`Capa do evento ${event.title}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="w-full h-64 md:h-100 bg-linear-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center text-white/50">
              <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
              <span className="font-bold text-xl tracking-widest uppercase">Sem Imagem</span>
            </div>
          )}

          <div className="p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
              {event.title}
            </h1>
            
            <p className="text-gray-600 mb-10 whitespace-pre-wrap text-lg leading-relaxed">
              {event.description}
            </p>
            
            {/* INFORMAÇÕES DO EVENTO */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 mb-10 border border-gray-100 flex flex-col sm:flex-row gap-6 sm:gap-12">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Data e Hora</span>
                  <span className="block text-lg text-gray-900 font-bold">
                    {event.event_date ? new Date(event.event_date).toLocaleString('pt-BR') : 'Sem data definida'}
                  </span>
                </div>
              </div>
              
              <div className="w-px bg-gray-200 hidden sm:block"></div>
              <div className="h-px w-full bg-gray-200 sm:hidden"></div>

              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Valor Unitário</span>
                  <span className="block text-2xl text-emerald-600 font-black tracking-tight">
                    {isFreeEvent ? 'Gratuito' : `R$ ${event.price.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* ÁREA DE PAGAMENTO / AÇÕES */}
            {pixData ? (
              <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm animate-in zoom-in-95 duration-500">
                <CardContent className="p-8 text-center flex flex-col items-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <QrCode className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-900 mb-2">Pague com PIX</h3>
                  <p className="text-emerald-700 font-medium mb-8">Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>
                  
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-100 mb-8 inline-block">
                    <img 
                      src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                      alt="QR Code PIX Mercado Pago" 
                      className="w-56 h-56 object-contain" 
                    />
                  </div>
                  
                  <div className="w-full max-w-md mb-8">
                    <p className="text-sm font-bold text-emerald-800 mb-2 text-left ml-1">Ou copie o código (PIX Copia e Cola):</p>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        readOnly 
                        value={pixData.qr_code} 
                        className="font-mono text-xs bg-white h-12 rounded-xl focus-visible:ring-emerald-500" 
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button 
                        onClick={copyPix}
                        className={`h-12 px-6 rounded-xl font-bold transition-all shrink-0 shadow-sm ${
                          copiedPix ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        {copiedPix ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={() => router.push('/tickets')}
                    className="w-full max-w-md h-14 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20"
                  >
                    Ir para Meus Ingressos
                  </Button>
                </CardContent>
              </Card>
            ) : pendingTicket ? (
              <Card className="bg-yellow-50/80 border-yellow-200 shadow-sm animate-in fade-in">
                <CardContent className="p-8 text-center flex flex-col items-center">
                  <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <Info className="w-7 h-7 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-900 mb-3">Você tem um pedido pendente!</h3>
                  <p className="text-yellow-800 font-medium mb-8 max-w-lg">
                    Identificamos que você já iniciou a compra de <strong>{pendingTicket.quantity || 1} ingresso(s)</strong> para este evento. O pagamento aguarda confirmação.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <Button 
                      variant="outline"
                      onClick={promptCancelPending}
                      className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
                    >
                      Cancelar Pedido
                    </Button>
                    <Button 
                      onClick={() => router.push(`/evento/${event.id}/${pendingTicket.id}`)}
                      className="flex-1 h-12 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl shadow-sm"
                    >
                      Continuar Pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : isSoldOut ? (
              <Card className="bg-gray-50 border-gray-200 shadow-none">
                <CardContent className="p-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-2">Esgotado</h3>
                  <p className="text-gray-500 text-lg">Infelizmente, todas as vagas para este evento já foram preenchidas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8 max-w-md mx-auto sm:max-w-none sm:mx-0">
                
                {availableSpots !== null && availableSpots <= 5 && (
                  <Badge variant="destructive" className="w-full justify-center text-sm py-2.5 bg-red-50 text-red-700 border-red-200 font-bold animate-pulse rounded-xl">
                    Corra! Restam apenas {availableSpots} vaga(s) disponível(is).
                  </Badge>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between p-6 border border-gray-200 rounded-2xl bg-white shadow-sm gap-6">
                  <span className="font-bold text-gray-700 text-lg">Quantidade de Ingressos:</span>

                  <div className="flex items-center gap-5">
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => Math.max(1, Number(q) - 1))}
                      className="w-12 h-12 rounded-full border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setQuantity('');
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) {
                            setQuantity(Math.min(maxSelectable, num));
                          }
                        }
                      }}
                      onBlur={() => {
                        let num = Number(quantity);
                        if (quantity === '' || num < 1) {
                          setQuantity(1);
                        } else if (num > maxSelectable) {
                          setQuantity(maxSelectable);
                        }
                      }}
                      className="w-16 h-12 text-2xl font-black text-gray-900 text-center bg-transparent border-none focus-visible:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => Math.min(maxSelectable, Number(q) + 1))} 
                      className="w-12 h-12 rounded-full border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row justify-between items-center p-6 rounded-2xl border gap-2 ${isFreeEvent ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'}`}>
                  <span className="font-bold text-gray-500 text-lg">Total a pagar:</span>
                  <span className={`text-4xl font-black tracking-tight ${isFreeEvent ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isFreeEvent ? 'Gratuito' : `R$ ${(event.price * (Number(quantity) || 1)).toFixed(2).replace('.', ',')}`}
                  </span>
                </div>

                <Button 
                  size="lg"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={buying}
                  className={`w-full h-16 text-white font-black text-xl rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    isFreeEvent 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {isFreeEvent ? 'Garantir Vaga (Gratuito)' : 'Garantir o meu Ingresso'}
                </Button>
              </div>
            )}

          </div>
        </Card>
      </div>
    </main>
  );
}