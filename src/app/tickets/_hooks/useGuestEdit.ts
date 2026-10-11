'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { callApi } from '@/lib/api-client';
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
      await callApi(`/api/guests/${form.id}`, 'PATCH', {
        name: form.name,
        email: form.email,
        cpf: form.cpf,
        phone: form.phone
      });

      toast.success('Dados do convidado atualizados com sucesso!');
      setIsOpen(false);
      onSaved();
    } catch (error) {
      console.error('Erro ao atualizar convidado:', error);
      toast.error(getErrorMessage(error, 'Erro ao atualizar. Tente novamente.'));
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
