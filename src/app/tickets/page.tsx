'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Ticket } from 'lucide-react';
import SmartModal from '@/components/SmartModal';
import { Button } from '@/components/ui/button';
import { useMyTickets } from './_hooks/useMyTickets';
import { useTicketActions } from './_hooks/useTicketActions';
import { useGuestEdit } from './_hooks/useGuestEdit';
import TicketsSkeleton from './_components/TicketsSkeleton';
import EmptyTickets from './_components/EmptyTickets';
import EditGuestModal from './_components/EditGuestModal';
import TicketCard from './_components/TicketCard';

export default function MyTickets() {
  const router = useRouter();
  const { tickets, loading, fetchTickets } = useMyTickets();
  const actions = useTicketActions(fetchTickets);
  const guestEdit = useGuestEdit(fetchTickets);

  if (loading && tickets.length === 0) return <TicketsSkeleton />;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <SmartModal dialog={actions.dialog} onClose={actions.closeDialog} isProcessing={actions.isProcessing} />

      {guestEdit.isOpen && (
        <EditGuestModal
          form={guestEdit.form}
          isSubmitting={guestEdit.isSubmitting}
          onChange={guestEdit.updateField}
          onCancel={guestEdit.closeEdit}
          onSave={guestEdit.saveGuest}
        />
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
          <EmptyTickets onExplore={() => router.push('/')} />
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onContinuePayment={(t) => router.push(`/evento/${t.event_id}/${t.id}`)}
                onCancel={actions.promptCancelTicket}
                onDelete={actions.promptDeleteTicket}
                onEditGuest={guestEdit.openEdit}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
