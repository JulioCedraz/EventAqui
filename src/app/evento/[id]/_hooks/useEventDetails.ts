'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { EventRow, PendingTicket } from '../types';

export function useEventDetails(id: string | undefined) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [soldTickets, setSoldTickets] = useState(0);
  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(null);
  const [hasApprovedTicket, setHasApprovedTicket] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', id).single();
      if (eventError) throw eventError;
      setEvent(eventData);

      // O RLS só mostra os ingressos do próprio usuário: o total vem do servidor
      const spotsRes = await fetch(`/api/events/${id}/spots`);
      if (spotsRes.ok) {
        const { sold } = await spotsRes.json();
        setSoldTickets(sold);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', id)
        .eq('buyer_email', session.user.email!)
        .in('payment_status', ['approved', 'pending']);

      if (!userTickets?.length) return;

      if (userTickets.some((t) => t.payment_status === 'approved')) setHasApprovedTicket(true);

      const pending = userTickets.find((t) => t.payment_status === 'pending');
      if (!pending) return;

      // Pedido vencido não ocupa vaga; o cron o cancela com folga para um pagamento ainda em trânsito.
      const isExpired = !!pending.expires_at && new Date(pending.expires_at) < new Date();
      setPendingTicket(isExpired ? null : pending);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar detalhes do evento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Na montagem loading já é true: o setLoading(true) síncrono não re-renderiza
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { event, loading, soldTickets, pendingTicket, setPendingTicket, hasApprovedTicket, refresh };
}
