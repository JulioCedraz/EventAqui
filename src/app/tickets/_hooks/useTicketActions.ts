'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DialogConfig } from '@/components/SmartModal';

export function useTicketActions(onChanged: () => Promise<void>) {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const runAction = async (action: () => PromiseLike<{ error: unknown }>, successMsg: string, errorMsg: string) => {
    setIsProcessing(true);
    try {
      const { error } = await action();
      if (error) throw error;
      await onChanged();
      toast.success(successMsg);
      setDialog(null);
    } catch (error) {
      console.error(errorMsg, error);
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const promptCancelTicket = (ticketId: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Cancelar Pedido',
      message: 'Tem certeza que deseja cancelar este pedido? O ingresso pendente será invalidado.',
      confirmText: 'Sim, cancelar',
      onConfirm: () => runAction(
        () => supabase.from('tickets').update({ payment_status: 'cancelled' }).eq('id', ticketId),
        'Pedido cancelado com sucesso.',
        'Não foi possível cancelar o pedido. Tente novamente.'
      )
    });
  };

  const promptDeleteTicket = (ticketId: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Pedido',
      message: 'Tem certeza que deseja excluir este pedido? Esta ação é irreversível e removerá o ingresso do seu histórico.',
      confirmText: 'Excluir',
      onConfirm: () => runAction(
        () => supabase.from('tickets').delete().eq('id', ticketId),
        'Pedido excluído do histórico.',
        'Não foi possível excluir o pedido. Tente novamente.'
      )
    });
  };

  return {
    dialog,
    isProcessing,
    closeDialog: () => setDialog(null),
    promptCancelTicket,
    promptDeleteTicket
  };
}
