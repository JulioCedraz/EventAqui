'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { PANEL_ROLES } from '@/lib/roles';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ArrowLeft, TrendingUp, Ticket, Clock, 
  Search, Filter, CheckCircle2, XCircle, AlertCircle, Tag, ArrowDownAZ 
} from "lucide-react";
import type { Tables } from '@/types/database.types';
import type { CouponSummary } from '@/types/tickets';

type OrderProfile = Pick<Tables<'profiles'>, 'id' | 'cpf' | 'phone' | 'university' | 'course' | 'semester' | 'enrollment_number'>;

type Order = {
  id: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  payment_status: string;
  quantity: number;
  event_id: string;
  user_id: string | null;
  coupon_id: string | null;
  isInheritedCoupon?: boolean;
  events: {
    title: string;
    price: number;
  };
  coupons?: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null;
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

function calculateOrderTotal(order: Order) {
  const basePrice = (order.events?.price || 0) * (order.quantity || 1);
  if (!order.coupons) return basePrice;

  let final = basePrice;
  if (order.coupons.discount_type === 'percentage') {
    final = final - (final * (order.coupons.discount_value / 100));
  } else {
    // Se for valor fixo e for um cupom herdado da casadinha, divide o desconto 
    // para não abater o valor duas vezes no KPI geral da receita.
    const discount = order.isInheritedCoupon ? (order.coupons.discount_value / 2) : order.coupons.discount_value;
    final = final - discount;
  }
  return Math.max(0, final);
}

export default function OrdersPage() {
  const access = useRoleGuard({
    allow: PANEL_ROLES,
    deniedMessage: 'Você não tem permissão para acessar esta área.',
    toastId: 'unauthorized-orders',
  });
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCouponFilter, setSelectedCouponFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('date_desc');

  useEffect(() => {
    if (!access) return;

    const fetchOrders = async () => {
      const { isAdmin, uid: currentUserId } = access;

      let query = supabase
        .from('tickets')
        .select(`
          id, created_at, buyer_name, buyer_email, payment_status, quantity, event_id, user_id, coupon_id, payment_method,
          events!inner ( title, price, producer_id ),
          coupons ( code, discount_type, discount_value )
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('events.producer_id', currentUserId);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (!ticketsError && ticketsData) {
        const userIds = Array.from(new Set(ticketsData.map((t) => t.user_id).filter(Boolean)));
        
        // Convidados que resgataram herdam o cupom do ingresso original da casadinha
        const { data: guestsData } = await supabase.from('guests').select('guest_email, ticket_id');
        const originalTicketsMap = new Map<string, (typeof ticketsData)[number]>();
        ticketsData.forEach((t) => originalTicketsMap.set(t.id, t));

        const guestCouponMap = new Map<string, CouponSummary>();
        guestsData?.forEach(guest => {
          const parentTicket = originalTicketsMap.get(guest.ticket_id);
          if (parentTicket && parentTicket.coupons) {
            const key = `${(guest.guest_email || '').toLowerCase()}_${parentTicket.event_id}`;
            guestCouponMap.set(key, parentTicket.coupons);
          }
        });

        const profilesMap: Record<string, OrderProfile> = {};
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

        const enrichedOrders = ticketsData.map((t) => {
          let appliedCoupon = t.coupons;
          let isInherited = false;

          if (!appliedCoupon && t.payment_status === 'approved' && t.payment_method === 'free' && t.quantity === 1) {
            const key = `${(t.buyer_email || '').toLowerCase()}_${t.event_id}`;
            if (guestCouponMap.has(key)) {
              appliedCoupon = guestCouponMap.get(key);
              isInherited = true;
            }
          }

          return {
            ...t,
            coupons: appliedCoupon,
            isInheritedCoupon: isInherited,
            profiles: t.user_id ? profilesMap[t.user_id] : null
          };
        });

        setOrders(enrichedOrders as unknown as Order[]);
        
        const uniqueEventsMap = new Map<string, string>();
        ticketsData.forEach((ticket) => {
          if (ticket.events && ticket.event_id) {
            uniqueEventsMap.set(ticket.event_id, ticket.events.title);
          }
        });
        
        const eventsList = Array.from(uniqueEventsMap.entries()).map(([id, title]) => ({ id, title }));
        setEvents(eventsList);
      }
      
      setLoading(false);
    };

    fetchOrders();
  }, [access]);

  const filteredOrders = useMemo(() => {
    const result = orders.filter(order => {
      const matchEvent = selectedEventId === 'all' || order.event_id === selectedEventId;
      const matchStatus = selectedStatus === 'all' || order.payment_status === selectedStatus;
      const matchCoupon = selectedCouponFilter === 'all' 
        ? true 
        : selectedCouponFilter === 'with' 
          ? !!order.coupons 
          : !order.coupons;
      
      return matchEvent && matchStatus && matchCoupon;
    });

    if (sortOrder === 'name_asc') {
      result.sort((a, b) => a.buyer_name.localeCompare(b.buyer_name));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [orders, selectedEventId, selectedStatus, selectedCouponFilter, sortOrder]);

  const kpis = useMemo(() => {
    let revenue = 0;
    let sold = 0;
    let pendingAmount = 0;

    filteredOrders.forEach(order => {
      const orderTotal = calculateOrderTotal(order);
      
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

  if (!access || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center transition-colors">
      <div className="w-full max-w-7xl space-y-8">
        
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pt-1 pb-1">
          <div className="mb-2 xl:mb-0">
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Vendas e Pedidos</h1>
            <p className="text-gray-500 dark:text-gray-400 transition-colors">Acompanhe a visão operacional das transações em tempo real.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
            <div className="relative flex items-center w-full">
              <ArrowDownAZ className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="date_desc">Mais recentes</option>
                <option value="name_asc">Ordem alfabética</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative flex items-center w-full">
              <Tag className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={selectedCouponFilter}
                onChange={(e) => setSelectedCouponFilter(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="all">Todos os pedidos</option>
                <option value="with">Com Cupom</option>
                <option value="without">Sem Cupom</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative flex items-center w-full">
              <Filter className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="all">Todos os Status</option>
                <option value="approved">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative flex items-center w-full">
              <Ticket className="w-4 h-4 absolute left-3 text-gray-400 dark:text-gray-500 transition-colors" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer truncate"
              >
                <option value="all">Todos os Eventos</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-sm border-0 dark:border dark:border-border rounded-2xl overflow-hidden relative transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 transition-opacity"><TrendingUp className="w-24 h-24 text-emerald-600 dark:text-emerald-500" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">RECEITA AUFERIDA</CardTitle>
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
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm text-gray-600 dark:text-gray-300 min-w-212.5">
                  <thead className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 text-[11px] md:text-xs uppercase font-bold border-b border-gray-100 dark:border-slate-800 transition-colors">
                    <tr>
                      <th className="px-4 py-3 md:px-5 md:py-4">Data</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">Comprador</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">CPF/Contato</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">Acadêmico</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">Evento</th>
                      <th className="px-4 py-3 md:px-5 md:py-4 text-center">Cupom</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">VALOR FINAL</th>
                      <th className="px-4 py-3 md:px-5 md:py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-card transition-colors">
                    {filteredOrders.map((order) => {
                      const finalAmount = calculateOrderTotal(order);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 transition-colors">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} <br/>
                            <span className="text-[10px] md:text-xs">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap">
                            <p className="font-bold text-gray-900 dark:text-gray-100 transition-colors">{order.buyer_name}</p>
                            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors">{order.buyer_email}</p>
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap">
                            <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">{order.profiles?.cpf || 'N/A'}</p>
                            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors">{order.profiles?.phone || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap">
                            {order.profiles?.university ? (
                              <>
                                <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-1 max-w-45" title={`${order.profiles.university} - ${order.profiles.course}`}>
                                  {order.profiles.university} - {order.profiles.course}
                                </p>
                                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                                  {order.profiles.semester} • Mat: {order.profiles.enrollment_number}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4">
                            <p className="font-medium text-gray-700 dark:text-gray-300 line-clamp-2 max-w-45 transition-colors" title={order.events?.title}>{order.events?.title}</p>
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 text-center whitespace-nowrap">
                            {order.coupons?.code ? (
                              <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2 py-0.5 font-bold transition-colors">
                                <Tag className="w-3 h-3 mr-1" /> {order.coupons.code}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap font-black text-gray-900 dark:text-gray-100 transition-colors">
                            {order.coupons && (
                              <span className="block text-[11px] text-gray-400 dark:text-gray-500 line-through">
                                R$ {((order.events?.price || 0) * (order.quantity || 1)).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            R$ {finalAmount.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-4 py-3 md:px-5 md:py-4 whitespace-nowrap">
                            {getStatusBadge(order.payment_status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}