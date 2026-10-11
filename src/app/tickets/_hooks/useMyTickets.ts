'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { CouponSummary } from '@/types/tickets';
import type { MyTicket } from '../types';

export function useMyTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);

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

      const guestCouponMap = new Map<string, CouponSummary>();
      if (guestsData) {
        guestsData.forEach((g) => {
          if (g.tickets?.event_id && g.tickets?.coupons) {
            guestCouponMap.set(g.tickets.event_id, g.tickets.coupons);
          }
        });
      }

      const enrichedTickets = ticketsData.map((t) => {
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
    // Na montagem loading já é true: o setLoading(true) síncrono não re-renderiza
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, fetchTickets };
}
