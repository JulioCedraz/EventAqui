'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  events: {
    title: string;
    price: number;
  };
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

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        router.push('/');
        return;
      } 
      
      setAuthorized(true);

      // Buscar todos os pedidos com os dados do evento atrelado
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id, created_at, buyer_name, buyer_email, payment_status, quantity, event_id,
          events ( title, price )
        `)
        .order('created_at', { ascending: false });

      if (!ticketsError && ticketsData) {
        setOrders(ticketsData as unknown as Order[]);
        
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

    checkAdminAndFetchData();
  }, [router]);

  // Filtra os pedidos com base no evento selecionado
  const filteredOrders = useMemo(() => {
    if (selectedEventId === 'all') return orders;
    return orders.filter(order => order.event_id === selectedEventId);
  }, [orders, selectedEventId]);

  // Calcula os KPIs dinamicamente com base no filtro
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
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Desconhecido</Badge>;
    }
  };

  if (isCheckingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 pb-1">
          <div>
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 flex items-center transition-colors w-fit mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Vendas e Pedidos</h1>
            <p className="text-gray-500">Acompanhe a visão operacional das transações em tempo real.</p>
          </div>

          {/* FILTRO DE EVENTOS */}
          <div className="relative flex items-center w-full sm:w-72">
            <Filter className="w-4 h-4 absolute left-3 text-gray-400" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer truncate"
            >
              <option value="all">Todos os Eventos</option>
              {events.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.title}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* CARDS DE KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-sm border-gray-100 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-emerald-600" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Receita Bruta (Paga)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600 tracking-tight">
                R$ {kpis.revenue.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Ticket className="w-24 h-24 text-blue-600" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ingressos Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600 tracking-tight">
                {kpis.sold} <span className="text-lg text-gray-400 font-medium tracking-normal">un.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-24 h-24 text-yellow-600" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Aguardando PIX</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-yellow-600 tracking-tight">
                R$ {kpis.pendingAmount.toFixed(2).replace('.', ',')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE PEDIDOS */}
        <Card className="shadow-sm border-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              Histórico de Transações
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold ml-2">
                {filteredOrders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-gray-50/50">
                <Ticket className="w-12 h-12 text-gray-300" />
                <p>Nenhuma transação encontrada para este filtro.</p>
              </div>
            ) : (
              <>
                {/* VERSÃO MOBILE (Cards empilhados) */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-4 sm:p-5 bg-white space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900 truncate max-w-50">{order.buyer_name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-50">{order.buyer_email}</p>
                        </div>
                        {getStatusBadge(order.payment_status)}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                        <p className="font-semibold text-gray-700 truncate">{order.events?.title}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-gray-500 text-xs">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-black text-gray-900">
                            {order.quantity}x R$ {(order.events?.price || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VERSÃO DESKTOP (Tabela) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Comprador</th>
                        <th className="px-6 py-4">Evento</th>
                        <th className="px-6 py-4 text-center">Qtd</th>
                        <th className="px-6 py-4">Valor Total</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} <span className="text-xs ml-1">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-gray-900">{order.buyer_name}</p>
                            <p className="text-xs text-gray-500">{order.buyer_email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-700 line-clamp-1" title={order.events?.title}>{order.events?.title}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-900">
                            {order.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-black text-gray-900">
                            R$ {((order.events?.price || 0) * (order.quantity || 1)).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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