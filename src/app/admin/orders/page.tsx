'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, ArrowLeft, TrendingUp, Ticket, Clock, 
  Search, Filter, CheckCircle2, XCircle, AlertCircle 
} from "lucide-react";

type Order = {
  id: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  payment_status: string;
  quantity: number;
  event_id: string;
  user_id: string | null;
  events: {
    title: string;
    price: number;
  };
  profiles?: {
    cpf: string | null;
    phone: string | null;
    university: string | null;
    course: string | null;
    semester: string | null;
    enrollment_number: string | null;
  } | null;
};

type EventSummary = {
  id: string;
  title: string;
};

export default function OrdersPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const currentUserId = session?.user?.id;

      if (!session || !userEmail || !currentUserId) {
        router.push('/');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single();

      const role = profile?.role || 'customer';
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const isAdmin = admins.includes(userEmail) || role === 'admin';
      const isProducer = role === 'producer';

      if (!isAdmin && !isProducer) {
        toast.error('Você não tem permissão para acessar esta área.', { id: 'unauthorized-orders' });
        router.push('/');
        return;
      }
      
      setAuthorized(true);

      let query = supabase
        .from('tickets')
        .select(`
          id, created_at, buyer_name, buyer_email, payment_status, quantity, event_id, user_id,
          events!inner ( title, price, producer_id )
        `)
        .order('created_at', { ascending: false });

      // Se não for Admin, traz APENAS os tickets dos eventos criados por este produtor
      if (!isAdmin) {
        query = query.eq('events.producer_id', currentUserId);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (!ticketsError && ticketsData) {
        // 1. Extrair os user_ids únicos para buscar os perfis complementares
        const userIds = Array.from(new Set(ticketsData.map((t: any) => t.user_id).filter(Boolean)));
        
        // 2. Buscar os dados acadêmicos e de contato na tabela profiles
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, cpf, phone, university, course, semester, enrollment_number')
            .in('id', userIds);
            
          if (profilesData) {
            profilesData.forEach(p => {
              profilesMap[p.id] = p;
            });
          }
        }

        // 3. Mesclar as informações
        const enrichedOrders = ticketsData.map((t: any) => ({
          ...t,
          profiles: t.user_id ? profilesMap[t.user_id] : null
        }));

        setOrders(enrichedOrders as unknown as Order[]);
        
        // Extrair eventos únicos para popular o filtro (Select)
        const uniqueEventsMap = new Map<string, string>();
        ticketsData.forEach((ticket: any) => {
          if (ticket.events && ticket.event_id) {
            uniqueEventsMap.set(ticket.event_id, ticket.events.title);
          }
        });
        
        const eventsList = Array.from(uniqueEventsMap.entries()).map(([id, title]) => ({ id, title }));
        setEvents(eventsList);
      }
      
      setLoading(false);
      setIsCheckingAuth(false);
    };

    checkAuthAndFetchData();
  }, [router]);

  // Filtra os pedidos com base no evento e no status selecionados
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchEvent = selectedEventId === 'all' || order.event_id === selectedEventId;
      const matchStatus = selectedStatus === 'all' || order.payment_status === selectedStatus;
      return matchEvent && matchStatus;
    });
  }, [orders, selectedEventId, selectedStatus]);

  // Calcula os KPIs dinamicamente com base nos filtros
  const kpis = useMemo(() => {
    let revenue = 0;
    let sold = 0;
    let pendingAmount = 0;

    filteredOrders.forEach(order => {
      const orderTotal = (order.events?.price || 0) * (order.quantity || 1);
      
      if (order.payment_status === 'approved') {
        revenue += orderTotal;
        sold += order.quantity || 1;
      } else if (order.payment_status === 'pending') {
        pendingAmount += orderTotal;
      }
    });

    return { revenue, sold, pendingAmount };
  }, [filteredOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 transition-colors"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 transition-colors"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 transition-colors"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary" className="transition-colors"><AlertCircle className="w-3 h-3 mr-1" /> Desconhecido</Badge>;
    }
  };

  if (isCheckingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center transition-colors">
      <div className="w-full max-w-7xl space-y-8">
        
        {/* CABEÇALHO E FILTROS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1 pb-1">
          <div>
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Vendas e Pedidos</h1>
            <p className="text-gray-500 dark:text-gray-400 transition-colors">Acompanhe a visão operacional das transações em tempo real.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            {/* FILTRO DE EVENTOS */}
            <div className="relative flex items-center w-full sm:w-64 lg:w-72">
              <Filter className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="all">Todos os Eventos</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* FILTRO DE STATUS */}
            <div className="relative flex items-center w-full sm:w-48">
              <Filter className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="all">Todos os Status</option>
                <option value="approved">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* CARDS DE KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-sm border-0 dark:border dark:border-border rounded-2xl overflow-hidden relative transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 transition-opacity"><TrendingUp className="w-24 h-24 text-emerald-600 dark:text-emerald-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Receita Bruta (Paga)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight transition-colors">
                R$ {kpis.revenue.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 dark:border dark:border-border rounded-2xl overflow-hidden relative transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 transition-opacity"><Ticket className="w-24 h-24 text-blue-600 dark:text-blue-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Ingressos Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight transition-colors">
                {kpis.sold} <span className="text-lg text-gray-400 dark:text-gray-500 font-medium tracking-normal transition-colors">un.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 dark:border dark:border-border rounded-2xl overflow-hidden relative transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 transition-opacity"><Clock className="w-24 h-24 text-yellow-600 dark:text-yellow-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Aguardando PIX</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 tracking-tight transition-colors">
                R$ {kpis.pendingAmount.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE PEDIDOS */}
        <Card className="shadow-sm border-0 dark:border dark:border-border rounded-3xl overflow-hidden transition-colors">
          <CardHeader className="bg-white dark:bg-card border-b border-gray-100 dark:border-border pb-4 transition-colors">
            <CardTitle className="text-lg font-bold flex items-center gap-2 transition-colors">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              Histórico de Transações
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 font-bold ml-2 transition-colors">
                {filteredOrders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-gray-50/50 dark:bg-card transition-colors">
                <Ticket className="w-12 h-12 text-gray-300 dark:text-slate-700 transition-colors" />
                <p>Nenhuma transação encontrada para este filtro.</p>
              </div>
            ) : (
              <>
                {/* VERSÃO MOBILE (Cards empilhados) */}
                <div className="xl:hidden divide-y-4 divide-gray-100 dark:divide-slate-800 transition-colors">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-5 bg-white dark:bg-transparent space-y-3 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-50 transition-colors">{order.buyer_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-50 transition-colors">{order.buyer_email}</p>
                        </div>
                        {getStatusBadge(order.payment_status)}
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700/50 text-sm transition-colors">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 truncate transition-colors">{order.events?.title}</p>
                        
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700/50 space-y-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-semibold">CPF:</span> {order.profiles?.cpf || 'N/A'} <span className="mx-1">|</span> <span className="font-semibold">Tel:</span> {order.profiles?.phone || 'N/A'}</p>
                          {order.profiles?.university && (
                            <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-semibold">Acadêmico:</span> {order.profiles.university} - {order.profiles.course} ({order.profiles.semester}) <br/> Matrícula: {order.profiles.enrollment_number}</p>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200 dark:border-slate-700/50">
                          <span className="text-gray-500 dark:text-gray-400 text-xs transition-colors">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-black text-gray-900 dark:text-gray-100 transition-colors">
                            {order.quantity}x R$ {(order.events?.price || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VERSÃO DESKTOP (Tabela Completa) */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-100 dark:border-slate-800 transition-colors">
                      <tr>
                        <th className="px-5 py-4">Data</th>
                        <th className="px-5 py-4">Comprador</th>
                        <th className="px-5 py-4">CPF/Contato</th>
                        <th className="px-5 py-4">Acadêmico</th>
                        <th className="px-5 py-4">Evento</th>
                        <th className="px-5 py-4 text-center">Qtd</th>
                        <th className="px-5 py-4">Total</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-100 dark:divide-slate-800 bg-white dark:bg-card transition-colors">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 transition-colors">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} <br/>
                            <span className="text-xs">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors">{order.buyer_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{order.buyer_email}</p>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">{order.profiles?.cpf || 'N/A'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{order.profiles?.phone || 'N/A'}</p>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {order.profiles?.university ? (
                              <>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-1 max-w-50" title={`${order.profiles.university} - ${order.profiles.course}`}>
                                  {order.profiles.university} - {order.profiles.course}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {order.profiles.semester} • Mat: {order.profiles.enrollment_number}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-700 dark:text-gray-300 line-clamp-2 max-w-50 transition-colors" title={order.events?.title}>{order.events?.title}</p>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-gray-900 dark:text-gray-100 transition-colors">
                            {order.quantity}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-black text-gray-900 dark:text-gray-100 transition-colors">
                            R$ {((order.events?.price || 0) * (order.quantity || 1)).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {getStatusBadge(order.payment_status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}