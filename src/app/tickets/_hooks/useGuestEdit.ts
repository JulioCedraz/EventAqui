'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Guest, GuestEditForm } from '../types';

const EMPTY_FORM: GuestEditForm = { id: '', name: '', email: '', cpf: '', phone: '' };

export function useGuestEdit(onSaved: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<GuestEditForm>(EMPTY_FORM);

  const openEdit = (guest: Guest) => {
    setForm({
      id: guest.id,
      name: guest.guest_name || '',
      email: guest.guest_email || '',
      cpf: guest.guest_cpf || '',
      phone: guest.guest_phone || ''
    });
    setIsOpen(true);
  };

  const updateField = (field: keyof Omit<GuestEditForm, 'id'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveGuest = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.cpf.trim()) {
      toast.error('Nome, E-mail e CPF são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          guest_name: form.name.trim(),
          guest_email: form.email.trim(),
          guest_cpf: form.cpf.trim(),
          guest_phone: form.phone.trim() || null,
          has_been_edited: true
        })
        .eq('id', form.id);

      if (error) throw error;

      toast.success('Dados do convidado atualizados com sucesso!');
      setIsOpen(false);
      onSaved();
    } catch (error) {
      console.error('Erro ao atualizar convidado:', error);
      toast.error('Erro ao atualizar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    isSubmitting,
    form,
    openEdit,
    closeEdit: () => setIsOpen(false),
    updateField,
    saveGuest
  };
}
