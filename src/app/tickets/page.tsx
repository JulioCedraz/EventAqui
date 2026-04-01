'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import Link from 'next/link';

export default function MyTickets() {
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

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
      
      fetchTickets();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      alert('Erro ao cancelar o pedido. Tente novamente.');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const isConfirmed = window.confirm('Tem certeza que deseja excluir este pedido? Esta ação é irreversível.');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      
      fetchTickets();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir o pedido. Tente novamente.');
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
                    {ticket.events?.event_date 
                      ? new Date(ticket.events.event_date).toLocaleString('pt-BR') 
                      : 'Data a definir'}
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
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 w-full sm:w-auto flex flex-col items-center gap-3 shadow-sm">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Código de Entrada</p>
                      
                      <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <QRCode
                          value={ticket.id}
                          size={120}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 120 120`}
                        />
                      </div>
                      
                      <div className="flex items-center justify-center sm:justify-end gap-2 w-full">
                        <p className="text-sm font-mono text-gray-900 break-all bg-white px-2 py-1 rounded border border-blue-100">
                          {ticket.id}
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(ticket.id);
                              
                              setCopiedTicketId(ticket.id);
                              setTimeout(() => setCopiedTicketId(null), 2000);
                              
                            } catch (error) {
                              console.error('Erro ao copiar', error);
                            }
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0"
                          title="Copiar código"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                          </svg>
                        </button>
                      </div>

                      {copiedTicketId === ticket.id && (
                        <p className="text-xs text-green-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                          ✓ Código copiado
                        </p>
                      )}
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

                  {ticket.payment_status === 'cancelled' && (
                    <button 
                      onClick={() => handleDeleteTicket(ticket.id)} 
                      className="bg-white text-gray-400 border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
                    >
                      Excluir Pedido
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