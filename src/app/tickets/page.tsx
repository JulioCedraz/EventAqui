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
  Trash2, XCircle, ArrowRight, QrCode 
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 space-x-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-gray-500 font-medium">Carregando os seus ingressos...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 relative">
      <SmartModal dialog={dialog} onClose={() => setDialog(null)} isProcessing={isModalProcessing} />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Ticket className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meus Ingressos</h1>
        </div>
        
        {tickets.length === 0 ? (
          <Card className="shadow-sm border-dashed border-2 border-gray-200 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum ingresso encontrado</h3>
              <p className="text-gray-500 mb-6 max-w-sm">Você ainda não garantiu a sua vaga em nenhum dos nossos eventos incríveis.</p>
              <Button onClick={() => router.push('/')} className="font-bold rounded-xl h-12 px-6 bg-blue-600 hover:bg-blue-700">
                Ver eventos disponíveis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row">
                  
                  {/* Info do Evento (Esquerda) */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="mb-4">
                      {ticket.payment_status === 'approved' && !ticket.is_used && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-bold mb-3">Pago / Confirmado</Badge>
                      )}
                      {ticket.payment_status === 'approved' && ticket.is_used && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold mb-3 border-gray-200">Ingresso Utilizado</Badge>
                      )}
                      {ticket.payment_status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 font-bold mb-3 animate-pulse">Aguardando Pagamento</Badge>
                      )}
                      {ticket.payment_status === 'cancelled' && (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 font-bold mb-3">Cancelado</Badge>
                      )}

                      <Link href={`/evento/${ticket.event_id}`} className="block group-hover:text-blue-600 transition-colors">
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">
                          {ticket.events?.title}
                        </h2>
                      </Link>
                      
                      <div className="flex items-center text-gray-500 font-medium">
                        <Calendar className="w-4 h-4 mr-2" />
                        {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
                      </div>
                    </div>
                  </div>

                  {/* Divisória tracejada no Desktop */}
                  <div className="hidden md:flex flex-col items-center justify-center relative">
                    <div className="w-6 h-6 rounded-full bg-gray-50 absolute -top-3 shadow-inner"></div>
                    <div className="w-px h-full border-r-2 border-dashed border-gray-200"></div>
                    <div className="w-6 h-6 rounded-full bg-gray-50 absolute -bottom-3 shadow-inner"></div>
                  </div>
                  
                  {/* Ações / QR Code (Direita) */}
                  <div className="p-6 md:p-8 bg-gray-50/50 md:w-[320px] flex flex-col justify-center items-center text-center border-t md:border-t-0 border-gray-100">
                    
                    {ticket.payment_status === 'approved' && !ticket.is_used && (
                      <div className="w-full flex flex-col items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 mb-4 inline-block">
                          <QRCode value={ticket.id} size={140} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 140 140`} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" /> Código de Entrada
                        </p>
                        
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl w-full overflow-hidden shadow-sm">
                          <span className="text-xs font-mono text-gray-600 truncate pl-3 py-2 flex-1 select-all text-left">
                            {ticket.id}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCopyCode(ticket.id)}
                            className={`rounded-none border-l h-full px-3 ${copiedTicketId === ticket.id ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'text-blue-600 hover:bg-blue-50'}`}
                          >
                            {copiedTicketId === ticket.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {ticket.is_used && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="font-bold text-gray-600">Este ingresso já foi validado na portaria.</p>
                      </div>
                    )}
                    
                    {ticket.payment_status === 'pending' && (
                      <div className="flex flex-col gap-3 w-full">
                        <Button 
                          onClick={() => router.push(`/evento/${ticket.event_id}/${ticket.id}`)} 
                          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                        >
                          Continuar Pagamento <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => promptCancelTicket(ticket.id)} 
                          className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar Pedido
                        </Button>
                      </div>
                    )}

                    {ticket.payment_status === 'cancelled' && (
                      <Button 
                        variant="ghost"
                        onClick={() => promptDeleteTicket(ticket.id)} 
                        className="w-full h-12 text-gray-500 hover:bg-red-50 hover:text-red-600 font-bold rounded-xl mt-2"
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