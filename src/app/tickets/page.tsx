'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import SmartModal, { DialogConfig } from '../../components/SmartModal';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Calendar, Ticket, Copy, CheckCircle2, 
  Trash2, XCircle, ArrowRight, QrCode, 
  ArrowLeft, Clock, Receipt, User, Wallet,
  Users, HelpCircle, Edit3, Link as LinkIcon
} from "lucide-react";

export default function MyTickets() {
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });

  const openEditModal = (guest: any) => {
    setEditForm({
      id: guest.id,
      name: guest.guest_name || '',
      email: guest.guest_email || '',
      cpf: guest.guest_cpf || '',
      phone: guest.guest_phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateGuest = async () => {
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.cpf.trim()) {
      toast.error('Nome, E-mail e CPF são obrigatórios.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          guest_name: editForm.name.trim(),
          guest_email: editForm.email.trim(),
          guest_cpf: editForm.cpf.trim(),
          guest_phone: editForm.phone.trim() || null,
          has_been_edited: true
        })
        .eq('id', editForm.id);

      if (error) throw error;

      toast.success('Dados do convidado atualizados com sucesso!');
      setIsEditModalOpen(false);
      fetchTickets();
    } catch (error: any) {
      console.error('Erro ao atualizar convidado:', error);
      toast.error('Erro ao atualizar. Tente novamente.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: ticketsData, error } = await supabase
      .from('tickets')
      .select(`*, events (*), coupons(code, discount_type, discount_value), guests(*)`)
      .eq('buyer_email', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar os seus ingressos.');
    } else if (ticketsData) {
      // Convidado que resgatou herda o cupom do ingresso original da casadinha
      const { data: guestsData } = await supabase
        .from('guests')
        .select(`
          tickets (
            event_id,
            coupons (code, discount_type, discount_value)
          )
        `)
        .eq('claimed_by_user_id', session.user.id);

      const guestCouponMap = new Map();
      if (guestsData) {
        guestsData.forEach((g: any) => {
          if (g.tickets?.event_id && g.tickets?.coupons) {
            guestCouponMap.set(g.tickets.event_id, g.tickets.coupons);
          }
        });
      }

      const enrichedTickets = ticketsData.map((t: any) => {
        let appliedCoupon = t.coupons;
        let isInherited = false;

        if (!appliedCoupon && t.quantity === 1 && !t.pix_qr_code && guestCouponMap.has(t.event_id)) {
          appliedCoupon = guestCouponMap.get(t.event_id);
          isInherited = true;
        }

        return {
          ...t,
          coupons: appliedCoupon,
          isInheritedCoupon: isInherited
        };
      });

      setTickets(enrichedTickets);
    }
    
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const calculateFinalPrice = (ticket: any) => {
    const basePrice = (ticket.events?.price || 0) * (ticket.quantity || 1);
    if (!ticket.coupons) return basePrice;
    
    let final = basePrice;
    if (ticket.coupons.discount_type === 'percentage') {
      final = final - (final * (ticket.coupons.discount_value / 100));
    } else {
      // Se for herdado da casadinha, divide o desconto fixo visualmente
      const discount = ticket.isInheritedCoupon ? (ticket.coupons.discount_value / 2) : ticket.coupons.discount_value;
      final = final - discount;
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

  const copyGuestLink = async (guestId: string) => {
    const magicLink = `${window.location.origin}/resgatar/${guestId}`;
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopiedLink(guestId);
      toast.success('Link de resgate copiado! Envie para seu convidado.');
      setTimeout(() => setCopiedLink(null), 3000);
    } catch (error) {
      toast.error('Falha ao copiar o link.');
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border-0 dark:bg-card">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800/50">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Editar Convidado
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Atenção: Por questões de segurança, esta alteração só pode ser feita <strong className="text-red-500 dark:text-red-400 font-bold">uma única vez</strong>. Verifique os dados com cuidado.
              </p>
            </div>
            
            <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/20">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nome Completo *</label>
                <Input 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Nome do convidado"
                  className="h-12 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">E-mail *</label>
                <Input 
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="h-12 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">CPF *</label>
                  <Input 
                    value={editForm.cpf}
                    onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="h-12 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Telefone</label>
                  <Input 
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="h-12 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 flex gap-3 border-t border-gray-100 dark:border-slate-800/50">
              <Button 
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmittingEdit}
                className="flex-1 h-12 rounded-xl font-bold dark:border-slate-700"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateGuest}
                disabled={isSubmittingEdit}
                className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingEdit ? 'Salvando...' : 'Salvar Dados'}
              </Button>
            </div>
          </Card>
        </div>
      )}

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
              const guest = ticket.guests && ticket.guests.length > 0 ? ticket.guests[0] : null;
              const isCasadinha = ticket.quantity === 2;
              
              return (
                <Card key={ticket.id} className="overflow-hidden rounded-2xl shadow-sm border-gray-200 dark:border-border dark:bg-card transition-all flex flex-col">
                  
                  {/* Ingresso do titular */}
                  <div className="flex flex-col md:flex-row h-full relative">
                    
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-between z-10">
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
                          
                          {ticket.payment_status === 'pending' && ticket.expires_at && (
                            <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> 
                              Pague até às {new Date(ticket.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <Link href={`/evento/${ticket.event_id}`} className="block hover:opacity-80 transition-opacity">
                          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 leading-tight transition-colors">
                            {ticket.events?.title}
                          </h2>
                        </Link>
                        
                        <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium text-sm transition-colors mb-4">
                          <Calendar className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                          {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
                        </div>
                      </div>

                      <div className="space-y-4 mt-auto z-10">
                        <div className="bg-gray-50/80 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 transition-colors">
                          <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5" /> Detalhes do Pedido {isCasadinha && '(Pacote Casadinha)'}
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                            <div>
                              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5"><User className="w-3 h-3" /> Titular {isCasadinha && '(Comprador)'}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">{ticket.buyer_name}</span>
                            </div>
                            <div>
                              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                                <Wallet className="w-3 h-3" /> Valor Total
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
                    </div>

                    {/* Divisória tracejada vertical do Titular (Desktop) */}
                    <div className="hidden md:flex flex-col items-center justify-center relative z-0">
                      {!isCasadinha && (
                        <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -top-3 shadow-inner transition-colors z-10"></div>
                      )}
                      <div className="w-px h-full border-r-2 border-dashed border-gray-200 dark:border-slate-800 transition-colors"></div>
                      {!isCasadinha && (
                        <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-background absolute -bottom-3 shadow-inner transition-colors z-10"></div>
                      )}
                    </div>
                    
                    {/* Divisória tracejada vertical (Mobile) */}
                    <div className="md:hidden h-px border-b-2 border-dashed border-gray-200 dark:border-slate-800 mx-6"></div>
                    
                    <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/30 md:w-[320px] flex flex-col justify-center items-center text-center transition-colors z-10">
                      
                      {ticket.payment_status === 'approved' && !ticket.is_used && (
                        <div className="w-full flex flex-col items-center">
                          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-4 inline-block transition-colors">
                            <QRCode value={ticket.id} size={140} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 140 140`} />
                          </div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 transition-colors">
                            <QrCode className="w-3.5 h-3.5" /> Seu QR Code
                          </p>
                          
                          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full overflow-hidden shadow-sm transition-colors">
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate pl-3 py-2 flex-1 select-all text-left transition-colors">
                              {ticket.id}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCopyCode(ticket.id)}
                              className={`h-full px-3 transition-colors ${copiedTicketId === ticket.id ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800'}`}
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

                  {/* Ingresso do convidado (casadinha) */}
                  {isCasadinha && guest && ticket.payment_status !== 'cancelled' && (
                    <>
                      {/* Divisória Horizontal Rasgada (Separação visual de ingressos) */}
                      <div className="relative flex items-center justify-center w-full z-20">
                        <div className="absolute left-0 -ml-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-background shadow-inner"></div>
                        <div className="w-full h-px border-b-2 border-dashed border-gray-300 dark:border-slate-700"></div>
                        <div className="absolute right-0 -mr-3 w-6 h-6 rounded-full bg-gray-50 dark:bg-background shadow-inner"></div>
                      </div>

                      <div className={`flex flex-col md:flex-row relative z-10 ${guest.is_claimed ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'bg-blue-50/40 dark:bg-blue-950/10'} transition-colors`}>
                        
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <Users className="w-5 h-5 text-blue-500" />
                              Ingresso do Convidado
                            </h4>
                            {guest.is_claimed ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 text-xs">Resgatado</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 px-3 py-1 text-xs">Aguardando Resgate</Badge>
                            )}
                          </div>

                          <div className="mb-6">
                            <p className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-gray-100 mb-1">{guest.guest_name}</p>
                            <p className="text-base text-gray-600 dark:text-gray-400 font-medium">{guest.guest_email}</p>
                          </div>

                          {!guest.is_claimed && (
                            <div className="flex flex-col xl:flex-row gap-3 w-full">
                              <Button 
                                variant="outline" 
                                onClick={() => copyGuestLink(guest.id)}
                                className="w-full xl:flex-1 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40 h-12 rounded-xl font-bold"
                              >
                                {copiedLink === guest.id ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                                Copiar Link de Resgate
                              </Button>
                              
                              <div className="flex items-stretch gap-2 w-full xl:flex-1">
                                <Button
                                  variant="ghost"
                                  disabled={guest.has_been_edited}
                                  onClick={() => openEditModal(guest)}
                                  className="flex-1 h-12 text-gray-600 hover:text-blue-700 hover:bg-blue-100 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-xl font-bold"
                                >
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  {guest.has_been_edited ? 'Dados Editados' : 'Editar Dados'}
                                </Button>

                                <div className="relative group flex items-center justify-center shrink-0">
                                  <button type="button" className="h-12 w-12 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none" aria-label="Informação sobre edição">
                                    <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" />
                                  </button>

                                  <div className="hidden group-hover:block group-focus-within:block absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-100 text-xs text-gray-100 dark:text-gray-800 text-center rounded-xl shadow-xl z-20 before:content-[''] before:absolute before:top-full before:right-4 sm:before:left-1/2 sm:before:right-auto sm:before:-translate-x-1/2 before:border-6 before:border-transparent before:border-t-gray-900 dark:before:border-t-gray-100">
                                    <strong className="block mb-1">Atenção!</strong>
                                    Os dados do convidado poderão ser alterados <b>uma única vez</b> enquanto o ingresso não for resgatado.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Divisória tracejada vertical do Convidado (Desktop) */}
                        <div className="hidden md:flex flex-col items-center justify-center relative">
                          <div className="w-px h-full border-r-2 border-dashed border-gray-300 dark:border-slate-700 transition-colors"></div>
                        </div>
                        
                        {/* Divisória tracejada vertical (Mobile) */}
                        <div className="md:hidden h-px border-b-2 border-dashed border-gray-300 dark:border-slate-700 mx-6"></div>

                        <div className="p-6 md:p-8 md:w-[320px] flex flex-col justify-center items-center text-center transition-colors">
                          {guest.is_claimed ? (
                            <div className="w-full flex flex-col items-center animate-in zoom-in-95">
                              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4 transition-colors shadow-inner border-4 border-white dark:border-slate-800">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <p className="text-lg font-black text-gray-800 dark:text-gray-200 mb-1">
                                Resgatado!
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 px-4 leading-relaxed">
                                O QR Code definitivo já está disponível na conta do seu convidado.
                              </p>
                            </div>
                          ) : (
                            <div className="w-full flex flex-col items-center opacity-80">
                              <div className="w-36 h-36 bg-white/50 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-gray-300 dark:border-slate-600 transition-colors shadow-sm">
                                <QrCode className="w-14 h-14 text-gray-300 dark:text-gray-600" />
                              </div>
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 transition-colors">
                                <Clock className="w-4 h-4" /> Aguardando
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors px-2 leading-relaxed font-medium">
                                O QR Code de entrada será gerado assim que o seu convidado acessar o link e criar a conta.
                              </p>
                            </div>
                          )}
                        </div>

                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}