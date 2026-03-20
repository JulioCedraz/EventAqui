'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function MyTickets() {
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
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
    };

    fetchTickets();
  }, [router]);

  if (loading) {
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
              <div key={ticket.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{ticket.events?.title}</h2>
                  <p className="text-gray-500 text-sm mb-2">
                    {new Date(ticket.events?.event_date).toLocaleString('pt-BR')}
                  </p>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ticket.payment_status === 'approved' ? 'bg-green-100 text-green-800' : 
                    ticket.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ticket.payment_status === 'approved' ? 'Pago' : 
                     ticket.payment_status === 'pending' ? 'Aguardando Pagamento' : 
                     'Cancelado'}
                  </span>
                </div>
                
                <div className="flex flex-col items-end gap-2 text-right">
                  
                  {ticket.payment_status === 'approved' && !ticket.is_used && (
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Código de Entrada</p>
                      <p className="text-sm font-mono text-gray-900 break-all">{ticket.id}</p>
                    </div>
                  )}
                  
                  {ticket.is_used && (
                    <span className="text-sm font-bold text-gray-400">Ingresso Utilizado</span>
                  )}

                  {ticket.payment_status === 'pending' && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                      Finalizar Pagamento
                    </button>
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