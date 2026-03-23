'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyTickets() {
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events (*)
      `)
      .eq('buyer_email', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCancelTicket = async (ticketId: string) => {
    const isConfirmed = window.confirm('Tem certeza que deseja cancelar este pedido?');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ payment_status: 'cancelled' })
        .eq('id', ticketId);

      if (error) throw error;
      
      alert('Pedido cancelado com sucesso.');
      fetchTickets();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      alert('Erro ao cancelar o pedido. Tente novamente.');
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Meus Ingressos</h1>
        
        {tickets.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500 mb-4">Você ainda não possui ingressos.</p>
            <button onClick={() => router.push('/')} className="text-blue-600 font-medium hover:underline">
              Ver eventos disponíveis
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-blue-200 transition-colors">
                
                <div>
                  <h2 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                    <Link href={`/evento/${ticket.event_id}`}>
                      {ticket.events?.title}
                    </Link>
                  </h2>
                  <p className="text-gray-500 text-sm mb-3">
                    {new Date(ticket.events?.event_date).toLocaleString('pt-BR')}
                  </p>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    ticket.payment_status === 'approved' ? 'bg-green-100 text-green-800' : 
                    ticket.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ticket.payment_status === 'approved' ? 'Pago' : 
                     ticket.payment_status === 'pending' ? 'Aguardando Pagamento' : 
                     'Cancelado'}
                  </span>
                </div>
                
                <div className="flex flex-col items-end gap-3 text-right w-full sm:w-auto">
                  
                  {ticket.payment_status === 'approved' && !ticket.is_used && (
                    <div className="bg-blue-50 px-4 py-3 rounded-xl border border-blue-100 w-full sm:w-auto text-center sm:text-right">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Código de Entrada</p>
                      <p className="text-sm font-mono text-gray-900 break-all bg-white px-2 py-1 rounded border border-blue-100">{ticket.id}</p>
                    </div>
                  )}
                  
                  {ticket.is_used && (
                    <span className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-lg">Ingresso Utilizado</span>
                  )}

                  {ticket.payment_status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => handleCancelTicket(ticket.id)} 
                        className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors w-full sm:w-auto"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => router.push(`/evento/${ticket.event_id}/${ticket.id}`)} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                      >
                        Continuar Pagamento
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}