'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';
import type { TablesInsert } from '@/types/database.types';
import type { EventFormValues, LocalCoupon } from '../types';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EMPTY_VALUES: EventFormValues = {
  title: '',
  description: '',
  eventDate: '',
  hasNoDate: false,
  price: '',
  isFree: false,
  totalSpots: '',
  hasNoSpotLimit: false,
};

// datetime-local espera horário local sem fuso
function toLocalInputValue(isoDate: string) {
  const date = new Date(isoDate);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function useEventForm(editId: string | null) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [values, setValues] = useState<EventFormValues>(EMPTY_VALUES);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const [coupons, setCoupons] = useState<LocalCoupon[]>([]);

  const update = (patch: Partial<EventFormValues>) => setValues(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    const checkAdminAndFetchEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const role = profile?.role || 'customer';
      const isAdmin = role === 'admin';
      const isProducer = role === 'producer';

      if (!isAdmin && !isProducer) {
        toast.error('Você não tem permissão para criar eventos.', { id: 'unauthorized-event-creation' });
        router.push('/');
        return;
      }

      setAuthorized(true);
      setIsCheckingAuth(false);

      if (!editId) return;

      setIsLoadingEvent(true);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', editId)
        .single();

      if (!data || error) {
        toast.error('Erro ao carregar os dados do evento.');
        router.push('/admin/events');
        setIsLoadingEvent(false);
        return;
      }

      setValues({
        title: data.title,
        description: data.description || '',
        eventDate: data.event_date ? toLocalInputValue(data.event_date) : '',
        hasNoDate: !data.event_date,
        price: data.price.toString(),
        isFree: Number(data.price) === 0,
        totalSpots: data.total_spots != null ? data.total_spots.toString() : '',
        hasNoSpotLimit: data.total_spots == null,
      });

      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('event_id', editId);

      if (couponsData) setCoupons(couponsData as LocalCoupon[]);
      setIsLoadingEvent(false);
    };

    checkAdminAndFetchEvent();
  }, [router, editId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0] || null;

    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Formato inválido. Selecione JPEG, PNG ou WEBP.');
      setImage(null);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('A imagem excede o tamanho máximo de 3MB.');
      setImage(null);
      e.target.value = '';
      return;
    }

    setImage(file);
  };

  const uploadCover = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(fileName, file);

    if (uploadError) throw new Error('Erro ao fazer upload da imagem.');

    const { data: publicUrlData } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  // Cupons criados antes de o evento existir ficam só no estado até o evento ser salvo
  const insertPendingCoupons = async (eventId: string, producerId: string) => {
    const couponsToInsert = coupons
      .filter(c => c.isNew)
      .map(c => ({
        code: c.code,
        event_id: eventId,
        producer_id: producerId,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        max_uses: c.max_uses,
        expires_at: c.expires_at,
        is_casadinha_only: c.is_casadinha_only || false
      }));

    if (couponsToInsert.length === 0) return;

    const { error: couponsError } = await supabase.from('coupons').insert(couponsToInsert);
    if (couponsError) {
      console.error('Erro nos cupons:', couponsError);
      toast.error('O evento foi salvo, mas houve uma falha ao registrar alguns cupons.');
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!values.isFree) {
      const numericPrice = parseFloat(values.price);
      if (isNaN(numericPrice) || numericPrice < 1) {
        toast.error('O valor do ingresso pago deve ser de no mínimo R$ 1,00. Para eventos gratuitos, marque a opção "Gratuito".');
        return;
      }
    }

    if (imageError) {
      toast.error('Corrija o erro da imagem antes de salvar.');
      return;
    }

    if (!currentUserId) {
      toast.error('Erro de autenticação. Tente fazer login novamente.');
      return;
    }

    setLoading(true);

    try {
      let targetEventId = editId;

      const payload: TablesInsert<'events'> = {
        title: values.title,
        description: values.description,
        event_date: values.hasNoDate ? null : new Date(values.eventDate).toISOString(),
        price: values.isFree ? 0 : parseFloat(values.price),
        total_spots: values.hasNoSpotLimit ? null : parseInt(values.totalSpots, 10),
      };

      if (image) payload.image_url = await uploadCover(image);

      if (editId) {
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editId);

        if (updateError) throw updateError;
        toast.success('Evento atualizado com sucesso!');
      } else {
        payload.producer_id = currentUserId;

        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert(payload)
          .select('id')
          .single();

        if (insertError) throw insertError;
        targetEventId = newEvent.id;
        toast.success('Evento publicado com sucesso!');
      }

      if (targetEventId && !values.isFree) {
        await insertPendingCoupons(targetEventId, currentUserId);
      }

      router.push('/admin/events');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao processar requisição'));
    } finally {
      setLoading(false);
    }
  };

  return {
    isCheckingAuth,
    authorized,
    isLoadingEvent,
    loading,
    currentUserId,
    values,
    update,
    imageError,
    handleImageChange,
    coupons,
    setCoupons,
    handleSubmit,
  };
}
