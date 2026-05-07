// src/app/admin/events/new/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, Calendar, Pencil, CheckCircle2, ArrowLeft 
} from "lucide-react";

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

      // Se existir um ID na URL, busca os dados para edição
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

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    // =========================================
    // REGRA DE NEGÓCIO: PREÇO MÍNIMO
    // =========================================
    if (!isFree) {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 10) {
        toast.error('O valor do ingresso pago deve ser de no mínimo R$ 10,00. Para eventos gratuitos, marque a opção "Gratuito".');
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

      const payload: any = {
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

        const { error: insertError } = await supabase
          .from('events')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Evento publicado com sucesso!');
      }
      
      router.push('/admin/events');

    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar requisição');
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
      <div className="w-full max-w-4xl space-y-8">
        
        <div className="pt-1 pb-1">
          <Link href="/admin/events" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            {editId ? 'Editar Evento' : 'Novo Evento'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">
            {editId ? 'Ajuste as informações deste evento.' : 'Preencha os detalhes abaixo para criar um novo evento na plataforma.'}
          </p>
        </div>

        <Card className={`shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden ${editId ? 'ring-2 ring-blue-500/50 shadow-blue-500/10' : 'dark:border dark:border-border'}`}>
          <CardHeader className="border-b border-gray-100 dark:border-border pb-6 transition-colors">
            <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
              {editId ? <><Pencil className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Formulário de Edição</> : <><Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Informações do Evento</>}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
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

              <div className="pt-6 border-t border-gray-100 dark:border-border flex flex-col-reverse sm:flex-row justify-end gap-3 transition-colors">
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
          </CardContent>
        </Card>

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