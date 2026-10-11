'use client';

import { useState, useEffect, Suspense } from 'react';
import { getErrorMessage } from '@/lib/utils';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SmartModal, { DialogConfig } from '../../../../components/SmartModal';
import { 
  Loader2, Calendar, Pencil, CheckCircle2, ArrowLeft, Tag, Plus, Trash2, Share2 
} from "lucide-react";
import type { TablesInsert } from '@/types/database.types';

interface LocalCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  isNew?: boolean;
  used_count?: number;
  is_casadinha_only?: boolean;
}

function EventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hasNoDate, setHasNoDate] = useState(false);
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [totalSpots, setTotalSpots] = useState('');
  const [hasNoSpotLimit, setHasNoSpotLimit] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');

  const [coupons, setCoupons] = useState<LocalCoupon[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [showTooltipFor, setShowTooltipFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  
  const [cCode, setCCode] = useState('');
  const [cType, setCType] = useState<'fixed'|'percentage'>('fixed');
  const [cValue, setCValue] = useState('');
  const [cMaxUses, setCMaxUses] = useState('');
  const [cExpires, setCExpires] = useState('');
  const [cIsCasadinhaOnly, setCIsCasadinhaOnly] = useState(false);

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
      const userEmail = session.user.email;
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const isAdmin = admins.includes(userEmail || '') || role === 'admin';
      const isProducer = role === 'producer';

      if (!isAdmin && !isProducer) {
        toast.error('Você não tem permissão para criar eventos.', { id: 'unauthorized-event-creation' });
        router.push('/');
        return;
      }
      
      setAuthorized(true);
      setIsCheckingAuth(false);

      if (editId) {
        setIsLoadingEvent(true);
        
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', editId)
          .single();

        if (data && !error) {
          setTitle(data.title);
          setDescription(data.description || '');
          
          if (data.event_date) {
            const dbDate = new Date(data.event_date);
            setEventDate(new Date(dbDate.getTime() - dbDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
            setHasNoDate(false);
          } else {
            setEventDate('');
            setHasNoDate(true);
          }

          setPrice(data.price.toString());
          if (Number(data.price) === 0) {
            setIsFree(true);
          } else {
            setIsFree(false);
          }
          
          if (data.total_spots !== null && data.total_spots !== undefined) {
            setTotalSpots(data.total_spots.toString());
            setHasNoSpotLimit(false);
          } else {
            setTotalSpots('');
            setHasNoSpotLimit(true);
          }

          const { data: couponsData } = await supabase
            .from('coupons')
            .select('*')
            .eq('event_id', editId);

          if (couponsData) {
            setCoupons(couponsData as LocalCoupon[]);
          }

        } else {
          toast.error('Erro ao carregar os dados do evento.');
          router.push('/admin/events');
        }
        setIsLoadingEvent(false);
      }
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

    const maxSize = 3 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setImageError('Formato inválido. Selecione JPEG, PNG ou WEBP.');
      setImage(null);
      e.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      setImageError('A imagem excede o tamanho máximo de 3MB.');
      setImage(null);
      e.target.value = '';
      return;
    }

    setImage(file);
  };

  const handleAddCoupon = async () => {
    if (!cCode.trim() || !cValue) {
      toast.error('Código e Valor são obrigatórios para criar um cupom.');
      return;
    }

    const numValue = parseFloat(cValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Valor do cupom inválido.');
      return;
    }

    if (cType === 'percentage' && numValue > 100) {
      toast.error('A porcentagem de desconto não pode ser maior que 100%.');
      return;
    }

    if (editId) {
      setIsSavingCoupon(true);
      const couponPayload = {
        code: cCode.toUpperCase().trim(),
        event_id: editId,
        producer_id: currentUserId,
        discount_type: cType,
        discount_value: numValue,
        max_uses: cMaxUses ? parseInt(cMaxUses, 10) : null,
        expires_at: cExpires ? new Date(cExpires).toISOString() : null,
        is_casadinha_only: cIsCasadinhaOnly
      };

      const { data: insertedCoupon, error } = await supabase
        .from('coupons')
        .insert(couponPayload)
        .select()
        .single();

      setIsSavingCoupon(false);

      if (error) {
        if (error.code === '23505') {
          toast.error('Este código de cupom já existe para este evento.');
        } else {
          toast.error('Erro ao salvar o cupom diretamente no banco.');
        }
        return;
      }

      setCoupons([...coupons, insertedCoupon as LocalCoupon]);
      toast.success('Cupom ativado com sucesso!');
      
      setShowTooltipFor(insertedCoupon.id);
      setTimeout(() => setShowTooltipFor(null), 6000);

    } else {
      const newCoupon: LocalCoupon = {
        id: `temp_${Date.now()}`,
        code: cCode.toUpperCase().trim(),
        discount_type: cType,
        discount_value: numValue,
        max_uses: cMaxUses ? parseInt(cMaxUses, 10) : null,
        expires_at: cExpires ? new Date(cExpires).toISOString() : null,
        isNew: true,
        is_casadinha_only: cIsCasadinhaOnly
      };
      setCoupons([...coupons, newCoupon]);
    }
    
    setCCode('');
    setCValue('');
    setCMaxUses('');
    setCExpires('');
    setCIsCasadinhaOnly(false);
    setShowCouponForm(false);
  };

  const handleRemoveCoupon = (idToRemove: string, isNew?: boolean) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Cupom',
      message: 'Tem certeza que deseja excluir este cupom? Esta ação é imediata e não pode ser desfeita.',
      confirmText: 'Sim, excluir',
      onConfirm: async () => {
        setIsModalProcessing(true);
        try {
          if (!isNew && editId) {
            const { error } = await supabase
              .from('coupons')
              .delete()
              .eq('id', idToRemove);
              
            if (error) throw error;
          }
          
          setCoupons(prev => prev.filter(c => c.id !== idToRemove));
          toast.success('Cupom excluído com sucesso!');
          setDialog(null);
        } catch (error) {
          console.error('Erro ao excluir cupom:', error);
          toast.error('Erro ao excluir o cupom. Tente novamente.');
        } finally {
          setIsModalProcessing(false);
        }
      }
    });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!isFree) {
      const numericPrice = parseFloat(price);
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
      let image_url = null;
      let targetEventId = editId;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(fileName, image);

        if (uploadError) throw new Error('Erro ao fazer upload da imagem.');

        const { data: publicUrlData } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName);
          
        image_url = publicUrlData.publicUrl;
      }

      const payload: TablesInsert<'events'> = {
        title,
        description,
        event_date: hasNoDate ? null : new Date(eventDate).toISOString(),
        price: isFree ? 0 : parseFloat(price),
        total_spots: hasNoSpotLimit ? null : parseInt(totalSpots, 10),
      };

      if (image_url) payload.image_url = image_url;

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

      if (targetEventId && !isFree) {
        const couponsToInsert = coupons
          .filter(c => c.isNew)
          .map(c => ({
            code: c.code,
            event_id: targetEventId,
            producer_id: currentUserId,
            discount_type: c.discount_type,
            discount_value: c.discount_value,
            max_uses: c.max_uses,
            expires_at: c.expires_at,
            is_casadinha_only: c.is_casadinha_only || false
          }));

        if (couponsToInsert.length > 0) {
          const { error: couponsError } = await supabase.from('coupons').insert(couponsToInsert);
          if (couponsError) {
            console.error('Erro nos cupons:', couponsError);
            toast.error('O evento foi salvo, mas houve uma falha ao registrar alguns cupons.');
          }
        }
      }
      
      router.push('/admin/events');

    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao processar requisição'));
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth || isLoadingEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-background transition-colors space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
        <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Carregando formulário...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center min-h-screen transition-colors">
      <SmartModal 
        dialog={dialog} 
        onClose={() => setDialog(null)} 
        isProcessing={isModalProcessing} 
      />
      <div className="w-full max-w-4xl space-y-8">
        
        <div className="pt-1 pb-1">
          <Link href="/admin/events" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            {editId ? 'Editar Evento' : 'Novo Evento'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">
            {editId ? 'Ajuste as informações deste evento e gerencie seus cupons de desconto.' : 'Preencha os detalhes abaixo para criar um novo evento na plataforma.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className={`shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden ${editId ? 'ring-2 ring-blue-500/50 shadow-blue-500/10' : 'dark:border dark:border-border'}`}>
            <CardHeader className="border-b border-gray-100 dark:border-border pb-6 transition-colors">
              <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
                {editId ? <><Pencil className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Formulário de Edição</> : <><Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Informações do Evento</>}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Evento</Label>
                  <Input 
                    id="title" 
                    required 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="h-12 rounded-xl transition-colors"
                    placeholder="Ex: Simpósio de Medicina 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <textarea 
                    id="description"
                    rows={6} 
                    required 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
                    placeholder="Detalhes sobre o evento, palestrantes, local..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="eventDate">Data e Hora</Label>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={hasNoDate} 
                          onChange={(e) => {
                            setHasNoDate(e.target.checked);
                            if (e.target.checked) setEventDate('');
                          }} 
                          className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors"
                        />
                        <span>Sem data definida</span>
                      </label>
                    </div>
                    <Input 
                      id="eventDate"
                      type="datetime-local" 
                      required={!hasNoDate} 
                      disabled={hasNoDate}
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)} 
                      className={`h-12 rounded-xl transition-colors ${hasNoDate ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500' : ''}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="price">Preço (R$)</Label>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isFree} 
                          onChange={(e) => {
                            setIsFree(e.target.checked);
                            if (e.target.checked) setPrice('0');
                            else setPrice('');
                          }} 
                          className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors"
                        />
                        <span>Gratuito</span>
                      </label>
                    </div>
                    <Input 
                      id="price"
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required={!isFree} 
                      disabled={isFree}
                      value={isFree ? '0' : price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      className={`h-12 rounded-xl transition-colors ${isFree ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500' : ''}`}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="totalSpots">Vagas Totais</Label>
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={hasNoSpotLimit} 
                          onChange={(e) => {
                            setHasNoSpotLimit(e.target.checked);
                            if (e.target.checked) setTotalSpots('');
                          }} 
                          className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors"
                        />
                        <span>Sem limite</span>
                      </label>
                    </div>
                    <Input 
                      id="totalSpots"
                      type="number" 
                      min="1" 
                      required={!hasNoSpotLimit} 
                      disabled={hasNoSpotLimit}
                      value={totalSpots} 
                      onChange={(e) => setTotalSpots(e.target.value)} 
                      className={`h-12 rounded-xl transition-colors ${hasNoSpotLimit ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500' : ''}`}
                      placeholder="Ex: 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">
                      Capa do Evento {editId && <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>}
                    </Label>
                    <Input 
                      id="image"
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleImageChange} 
                      className={`h-12 rounded-xl cursor-pointer pt-2.5 transition-colors ${
                        imageError ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400' : ''
                      }`}
                    />
                    {imageError ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in flex items-center gap-1 transition-colors">
                        {imageError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground transition-colors">JPEG, PNG ou WEBP (Max: 3MB).</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isFree && (
            <Card className="shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden dark:border dark:border-border">
              <CardHeader className="border-b border-gray-100 dark:border-border pb-6 flex flex-row items-center justify-between transition-colors">
                <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
                  <Tag className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Cupons de Desconto
                </CardTitle>
                {!showCouponForm && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCouponForm(true)} 
                    className="rounded-xl h-9 font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Novo Cupom
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                
                {coupons.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {coupons.map(coupon => (
                      <div key={coupon.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded text-sm tracking-wide">
                              {coupon.code}
                            </span>
                            {coupon.is_casadinha_only && (
                              <span className="font-bold uppercase bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-0.5 rounded text-[10px] tracking-wide">
                                Exclusivo Casadinha
                              </span>
                            )}
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value.toFixed(2)} OFF`}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex gap-2 mt-1">
                            <span>{coupon.max_uses ? `${coupon.used_count || 0}/${coupon.max_uses} usos` : 'Uso ilimitado'}</span>
                            <span>•</span>
                            <span>{coupon.expires_at ? `Validade: ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}` : 'Sem validade'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {editId && !coupon.isNew && (
                            <div className="relative flex items-center justify-center">
                              {showTooltipFor === coupon.id && (
                                <div className="absolute bottom-full mb-3 right-0 w-56 bg-blue-600 text-white text-sm leading-tight font-medium p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                                   Divulgue o evento com este cupom já aplicado! ✅
                                  <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-blue-600 rotate-45 rounded-sm"></div>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const url = `${window.location.origin}/evento/${editId}?cupom=${coupon.code}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Link promocional copiado!');
                                  setShowTooltipFor(null);
                                }}
                                className={`transition-all duration-300 rounded-xl ${showTooltipFor === coupon.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 animate-pulse' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-500/10'}`}
                                title="Divulgue o evento com este cupom já aplicado!"
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveCoupon(coupon.id, coupon.isNew)} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl"
                            title="Remover cupom"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showCouponForm && (
                  <div className="p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 space-y-5 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Código do Cupom</Label>
                        <Input 
                          value={cCode} 
                          onChange={e => setCCode(e.target.value.toUpperCase())} 
                          placeholder="Ex: CALOURO20" 
                          className="h-11 rounded-xl uppercase font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Desconto</Label>
                        <select 
                          value={cType} 
                          onChange={e => setCType(e.target.value as 'fixed' | 'percentage')} 
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Desconto ({cType === 'percentage' ? '%' : 'R$'})</Label>
                        <Input 
                          type="number" 
                          step={cType === 'percentage' ? '1' : '0.01'} 
                          min="0.01" 
                          value={cValue} 
                          onChange={e => setCValue(e.target.value)} 
                          placeholder={cType === 'percentage' ? 'Ex: 20' : 'Ex: 20.00'} 
                          className="h-11 rounded-xl" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Limite de Usos <span className="text-muted-foreground font-normal ml-1">(Opcional)</span></Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={cMaxUses} 
                          onChange={e => setCMaxUses(e.target.value)} 
                          placeholder="Ex: 50 (Deixe em branco para ilimitado)" 
                          className="h-11 rounded-xl" 
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Data de Validade <span className="text-muted-foreground font-normal ml-1">(Opcional)</span></Label>
                        <Input 
                          type="datetime-local" 
                          value={cExpires} 
                          onChange={e => setCExpires(e.target.value)} 
                          className="h-11 rounded-xl" 
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2 pt-3 border-t border-blue-100/50 dark:border-blue-900/30">
                        <label className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={cIsCasadinhaOnly} 
                            onChange={(e) => setCIsCasadinhaOnly(e.target.checked)} 
                            className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors"
                          />
                          <span>Válido <strong className="text-blue-600 dark:text-blue-400">exclusivamente</strong> para ingressos Casadinha (Compre 1 Leve 2)</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setShowCouponForm(false)} className="rounded-xl h-11 px-6 font-medium">
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleAddCoupon} disabled={isSavingCoupon} className="rounded-xl h-11 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        {isSavingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar Cupom'}
                      </Button>
                    </div>
                  </div>
                )}

                {!showCouponForm && coupons.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Nenhum cupom de desconto vinculado a este evento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3 transition-colors">
            <Link href="/admin/events" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
              ) : editId ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Salvar Alterações</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Publicar Evento</>
              )}
            </Button>
          </div>
        </form>

      </div>
    </main>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    }>
      <EventForm />
    </Suspense>
  );
}