'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { applyDiscount } from '@/lib/pricing';
import { getErrorMessage } from '@/lib/utils';
import { cancelTicket } from '@/lib/api-client';
import SmartModal, { DialogConfig } from '@/components/SmartModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEventDetails } from './_hooks/useEventDetails';
import { useCoupon } from './_hooks/useCoupon';
import { EventCover, EventInfo } from './_components/EventDetailsHeader';
import { OrderSummaryModal } from './_components/OrderSummaryModal';
import { PixPaymentCard } from './_components/PixPaymentCard';
import { ApprovedTicketCard, PendingOrderCard, SoldOutCard } from './_components/OrderStatusCards';
import { PurchasePanel } from './_components/PurchasePanel';
import type { GuestData, PixData } from './types';

const EMPTY_GUEST: GuestData = { name: '', email: '', cpf: '', phone: '' };

export default function EventDetails() {
  const router = useRouter();
  const id = useParams()?.id as string;
  const autoCoupon = useSearchParams()?.get('cupom');

  const { event, loading, soldTickets, pendingTicket, setPendingTicket, hasApprovedTicket, refresh } = useEventDetails(id);
  const [isCasadinha, setIsCasadinha] = useState(false);
  const coupon = useCoupon({ eventId: event?.id, isCasadinha, autoCoupon });

  const [guest, setGuest] = useState<GuestData>(EMPTY_GUEST);
  const [buying, setBuying] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Carregando detalhes do evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4 transition-colors">
        <Card className="max-w-md w-full py-12 text-center shadow-sm dark:bg-card dark:border-border transition-colors">
          <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4 transition-colors" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors">Evento não encontrado</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors">O evento que procura não existe ou foi removido.</p>
          <Button onClick={() => router.push('/')} className="mt-6 font-bold" variant="outline">
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  const isSoldOut = event.total_spots !== null && soldTickets >= event.total_spots;
  const availableSpots = event.total_spots !== null ? Math.max(0, event.total_spots - soldTickets) : null;
  const isFreeEvent = event.price === 0;
  const basePrice = event.price * (isCasadinha ? 2 : 1);
  // Apenas exibição: o valor cobrado é recalculado no servidor.
  const finalPrice = applyDiscount(basePrice, coupon.appliedCoupon);

  const changeTicketType = (casadinha: boolean) => {
    setIsCasadinha(casadinha);
    if (!casadinha) coupon.dropCasadinhaOnlyCoupon();
  };

  const promptCancelPending = () => {
    if (!pendingTicket) return;

    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Cancelar Pedido',
      message: 'Tem certeza que deseja cancelar o seu pedido pendente? Você poderá refazer a compra depois se ainda houver vagas.',
      confirmText: 'Sim, cancelar',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          await cancelTicket(pendingTicket.id);

          setPendingTicket(null);
          refresh();
          toast.success('Pedido cancelado com sucesso.');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao cancelar:', error);
          toast.error(getErrorMessage(error, 'Erro ao cancelar o pedido. Tente novamente.'));
        } finally {
          setIsModalProcessing(false);
        }
      },
    });
  };

  const openConfirmModal = () => {
    if (isCasadinha && (!guest.name.trim() || !guest.email.trim() || !guest.cpf.trim())) {
      toast.error('Por favor, preencha o Nome, E-mail e CPF do seu convidado.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleBuy = async () => {
    setBuying(true);
    const toastId = toast.loading(finalPrice === 0 ? 'Garantindo sua vaga...' : 'Gerando PIX seguro e reservando a sua vaga...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.dismiss(toastId);
        router.push('/login');
        return;
      }

      // O servidor cria o ingresso, calcula o preço e gera o PIX
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          isCasadinha,
          couponCode: coupon.appliedCoupon?.code,
          guest: isCasadinha ? { ...guest, phone: guest.phone.trim() || undefined } : undefined,
        }),
      });

      const paymentResponse = await res.json();
      if (!res.ok) throw new Error(paymentResponse.erro || 'Falha ao processar o pedido');

      if (paymentResponse.is_free) {
        toast.success('Inscrição confirmada com sucesso!', { id: toastId });
        setShowConfirmModal(false);
        router.push('/tickets');
        return;
      }

      setPixData(paymentResponse);
      setPendingTicket({ id: paymentResponse.ticketId, expires_at: paymentResponse.expires_at });
      setShowConfirmModal(false);
      toast.success('PIX gerado! Realize o pagamento em até 30 minutos.', { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao processar requisição.'), { id: toastId });
      setShowConfirmModal(false);
    } finally {
      setBuying(false);
    }
  };

  const renderOrderArea = () => {
    if (pixData) return <PixPaymentCard pixData={pixData} />;
    if (pendingTicket) return <PendingOrderCard eventId={event.id} ticketId={pendingTicket.id} onCancel={promptCancelPending} />;
    if (hasApprovedTicket) return <ApprovedTicketCard />;
    if (isSoldOut) return <SoldOutCard />;

    return (
      <PurchasePanel
        availableSpots={availableSpots}
        isFreeEvent={isFreeEvent}
        isCasadinha={isCasadinha}
        onTicketTypeChange={changeTicketType}
        guest={guest}
        onGuestChange={setGuest}
        couponInput={coupon.couponInput}
        onCouponInputChange={coupon.setCouponInput}
        appliedCoupon={coupon.appliedCoupon}
        isApplyingCoupon={coupon.isApplyingCoupon}
        onApplyCoupon={() => coupon.applyCoupon()}
        onRemoveCoupon={coupon.removeCoupon}
        basePrice={basePrice}
        finalPrice={finalPrice}
        buying={buying}
        onBuy={openConfirmModal}
      />
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-8 md:py-12 px-4 md:px-6 lg:px-8 relative transition-colors">
      <SmartModal dialog={dialog} onClose={() => setDialog(null)} isProcessing={isModalProcessing} />

      {showConfirmModal && (
        <OrderSummaryModal
          basePrice={basePrice}
          finalPrice={finalPrice}
          isFreeEvent={isFreeEvent}
          isCasadinha={isCasadinha}
          appliedCoupon={coupon.appliedCoupon}
          buying={buying}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleBuy}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <Card className="rounded-3xl shadow-lg overflow-hidden border-0 bg-white dark:bg-card transition-colors">
          <EventCover event={event} />
          <div className="p-6 md:p-10">
            <EventInfo event={event} />
            {renderOrderArea()}
          </div>
        </Card>
      </div>
    </main>
  );
}
