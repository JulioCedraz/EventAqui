'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import SmartModal, { DialogConfig } from '../../components/SmartModal';

// Componentes shadcn/ui e ícones
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calendar, Ticket, Copy, CheckCircle2, 
  Trash2, XCircle, ArrowRight, QrCode, 
  ArrowLeft, Clock, Receipt, User, Wallet
} from "lucide-react";

export default function MyTickets() {
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('tickets')
      .select(`*, events (*), coupons(code, discount_type, discount_value)`)
      .eq('buyer_email', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar os seus ingressos.');
    } else {
      setTickets(data || []);
    }
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Função para calcular o valor final pago no ingresso
  const calculateFinalPrice = (ticket: any) => {
    const basePrice = (ticket.events?.price || 0) * (ticket.quantity || 1);
    if (!ticket.coupons) return basePrice;
    
    let final = basePrice;
    if (ticket.coupons.discount_type === 'percentage') {
      final = final - (final * (ticket.coupons.discount_value / 100));
    } else {
      final = final - ticket.coupons.discount_value;
    }
    return Math.max(0, final);
  };

  const promptCancelTicket = (ticketId: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Cancelar Pedido',
      message: 'Tem certeza que deseja cancelar este pedido? O ingresso pendente será invalidado.',
      confirmText: 'Sim, cancelar',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          const { error } = await supabase.from('tickets').update({ payment_status: 'cancelled' }).eq('id', ticketId);
          if (error) throw error;
          await fetchTickets();
          toast.success('Pedido cancelado com sucesso.');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao cancelar:', error);
          toast.error('Não foi possível cancelar o pedido. Tente novamente.');
        } finally {
          setIsModalProcessing(false);
        }
      }
    });
  };

  const promptDeleteTicket = (ticketId: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Pedido',
      message: 'Tem certeza que deseja excluir este pedido? Esta ação é irreversível e removerá o ingresso do seu histórico.',
      confirmText: 'Excluir',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
          if (error) throw error;
          await fetchTickets();
          toast.success('Pedido excluído do histórico.');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao excluir:', error);
          toast.error('Não foi possível excluir o pedido. Tente novamente.');
        } finally {
          setIsModalProcessing(false);
        }
      }
    });
  };

  const handleCopyCode = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedTicketId(id);
      toast.success('Código copiado com sucesso!');
      setTimeout(() => setCopiedTicketId(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar', error);
      toast.error('Erro ao copiar o código.');
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 relative transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-lg w-64 animate-pulse"></div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card">
                <div className="flex flex-col md:flex-row h-full">
                  <div className="flex-1 p-6 md:p-8 space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded-md w-32 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-md w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded-md w-1/2 animate-pulse"></div>
                    <div className="h-24 bg-gray-100 dark:bg-slate-900/50 rounded-xl mt-6 animate-pulse"></div>
                  </div>
                  <div className="hidden md:block w-px border-r-2 border-dashed border-gray-100 dark:border-slate-800"></div>
                  <div className="p-6 md:p-8 md:w-[320px] flex justify-center items-center">
                    <div className="w-32 h-32 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <SmartModal dialog={dialog} onClose={() => setDialog(null)} isProcessing={isModalProcessing} />

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Ticket className="w-8 h-8 text-blue-600 dark:text-blue-500 transition-colors" />
           <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            Meus Ingressos
            </h1>
          <Button
           variant="ghost"
           onClick={() => router.back()}
           className="sm:ml-auto text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-bold transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
        
        {tickets.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-32 h-32 bg-blue-50 dark:bg-blue-500/5 rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner">
              <Ticket className="w-12 h-12 text-blue-300 dark:text-blue-500/40 transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Seu histórico está vazio</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md text-lg transition-colors">
              Você ainda não garantiu ingressos para nenhum evento. Explore a plataforma e encontre a sua próxima experiência!
            </p>
            <Button onClick={() => router.push('/')} size="lg" className="font-bold rounded-2xl h-14 px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105">
              Explorar Eventos
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const finalPrice = calculateFinalPrice(ticket);
              
              return (
                <Card key={ticket.id} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row h-full">
                    
                    {/* Info do Evento e Recibo (Esquerda) */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                      <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                          {ticket.payment_status === 'approved' && !ticket.is_used && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 font-bold transition-colors w-fit">Pago / Confirmado</Badge>
                          )}
                          {ticket.payment_status === 'approved' && ticket.is_used && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700 transition-colors w-fit">Ingresso Utilizado</Badge>
                          )}
                          {ticket.payment_status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold animate-pulse transition-colors w-fit">Aguardando Pagamento</Badge>
                          )}
                          {ticket.payment_status === 'cancelled' && (
                            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold transition-colors w-fit">Cancelado</Badge>
                          )}
                          
                          {/* Alerta de Expiração para ingressos pendentes */}
                          {ticket.payment_status === 'pending' && ticket.expires_at && (
                            <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> 
                              Pague até às {new Date(ticket.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <Link href={`/evento/${ticket.event_id}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 leading-tight transition-colors">
                            {ticket.events?.title}
                          </h2>
                        </Link>
                        
                        <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium text-sm transition-colors">
                          <Calendar className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                          {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
                        </div>
                      </div>

                      {/* Detalhes da Compra / Recibo */}
                      <div className="bg-gray-50/80 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 mt-auto transition-colors">
                        <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5" /> Detalhes do Pedido
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                          <div>
                            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5"><User className="w-3 h-3" /> Titular</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">{ticket.buyer_name}</span>
                          </div>
                          <div>
                            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                              <Wallet className="w-3 h-3" /> Valor
                              {ticket.coupons?.code && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-500/30">
                                  {ticket.coupons.code}
                                </span>
                              )}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              {ticket.coupons && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                  R$ {((ticket.events?.price || 0) * (ticket.quantity || 1)).toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {finalPrice === 0 ? 'Gratuito' : `R$ ${finalPrice.toFixed(2).replace('.', ',')}`}
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

                    {/* Divisória tracejada no Desktop */}
                    <div className="hidden md:flex flex-col items-center justify-center relative">
                      <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -top-3 shadow-inner transition-colors z-10"></div>
                      <div className="w-px h-full border-r-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors"></div>
                      <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -bottom-3 shadow-inner transition-colors z-10"></div>
                    </div>
                    
                    {/* Divisória mobile */}
                    <div className="md:hidden h-px border-b-2 border-dashed border-gray-200 dark:border-slate-800 mx-6"></div>
                    
                    {/* Ações / QR Code (Direita) */}
                    <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/30 md:w-[320px] flex flex-col justify-center items-center text-center transition-colors">
                      
                      {ticket.payment_status === 'approved' && !ticket.is_used && (
                        <div className="w-full flex flex-col items-center">
                          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-4 inline-block transition-colors">
                            <QRCode value={ticket.id} size={140} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 140 140`} />
                          </div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 transition-colors">
                            <QrCode className="w-3.5 h-3.5" /> Código de Entrada
                          </p>
                          
                          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full overflow-hidden shadow-sm transition-colors">
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate pl-3 py-2 flex-1 select-all text-left transition-colors">
                              {ticket.id}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCopyCode(ticket.id)}
                              className={`rounded-none border-l border-gray-200 dark:border-slate-700 h-full px-3 transition-colors ${copiedTicketId === ticket.id ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800'}`}
                            >
                              {copiedTicketId === ticket.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                            onClick={() => router.push(`/evento/${ticket.event_id}/${ticket.id}`)} 
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
                          >
                            Continuar Pagamento <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => promptCancelTicket(ticket.id)} 
                            className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 font-bold rounded-xl transition-colors"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Cancelar Pedido
                          </Button>
                        </div>
                      )}

                      {ticket.payment_status === 'cancelled' && (
                        <Button 
                          variant="ghost"
                          onClick={() => promptDeleteTicket(ticket.id)} 
                          className="w-full h-12 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 font-bold rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir do Histórico
                        </Button>
                      )}

                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}