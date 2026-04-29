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
  Loader2, Calendar, Ticket, Copy, CheckCircle2, 
  Trash2, XCircle, ArrowRight, QrCode, 
  ArrowLeft
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
      .select(`*, events (*)`)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background space-x-3 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
        <span className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Carregando os seus ingressos...</span>
      </div>
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
          <Card className="shadow-sm border-dashed border-2 border-gray-200 dark:border-slate-800 bg-transparent transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 transition-colors">
                <Ticket className="w-8 h-8 text-gray-400 dark:text-gray-500 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2 transition-colors">Nenhum ingresso encontrado</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm transition-colors">Você ainda não garantiu a sua vaga em nenhum dos nossos eventos incríveis.</p>
              <Button onClick={() => router.push('/')} className="font-bold rounded-xl h-12 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors">
                Ver eventos disponíveis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row">
                  
                  {/* Info do Evento (Esquerda) */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="mb-4">
                      {ticket.payment_status === 'approved' && !ticket.is_used && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 font-bold mb-3 transition-colors">Pago / Confirmado</Badge>
                      )}
                      {ticket.payment_status === 'approved' && ticket.is_used && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold mb-3 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700 transition-colors">Ingresso Utilizado</Badge>
                      )}
                      {ticket.payment_status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold mb-3 animate-pulse transition-colors">Aguardando Pagamento</Badge>
                      )}
                      {ticket.payment_status === 'cancelled' && (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold mb-3 transition-colors">Cancelado</Badge>
                      )}

                      <Link href={`/evento/${ticket.event_id}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 leading-tight transition-colors">
                          {ticket.events?.title}
                        </h2>
                      </Link>
                      
                      <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium transition-colors">
                        <Calendar className="w-4 h-4 mr-2" />
                        {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
                      </div>
                    </div>
                  </div>

                  {/* Divisória tracejada no Desktop */}
                  <div className="hidden md:flex flex-col items-center justify-center relative">
                    <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -top-3 shadow-inner transition-colors"></div>
                    <div className="w-px h-full border-r-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors"></div>
                    <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -bottom-3 shadow-inner transition-colors"></div>
                  </div>
                  
                  {/* Ações / QR Code (Direita) */}
                  <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/30 md:w-[320px] flex flex-col justify-center items-center text-center border-t md:border-t-0 border-gray-100 dark:border-slate-800 transition-colors">
                    
                    {ticket.payment_status === 'approved' && !ticket.is_used && (
                      <div className="w-full flex flex-col items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-800 mb-4 inline-block transition-colors">
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
                            className={`rounded-none border-l dark:border-slate-700 h-full px-3 transition-colors ${copiedTicketId === ticket.id ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800'}`}
                          >
                            {copiedTicketId === ticket.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {ticket.is_used && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                          <CheckCircle2 className="w-8 h-8 text-gray-500 dark:text-gray-400 transition-colors" />
                        </div>
                        <p className="font-bold text-gray-600 dark:text-gray-400 transition-colors">Este ingresso já foi validado na portaria.</p>
                      </div>
                    )}
                    
                    {ticket.payment_status === 'pending' && (
                      <div className="flex flex-col gap-3 w-full">
                        <Button 
                          onClick={() => router.push(`/evento/${ticket.event_id}/${ticket.id}`)} 
                          className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors"
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
                        className="w-full h-12 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 font-bold rounded-xl mt-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir do Histórico
                      </Button>
                    )}

                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}