'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartModal, { DialogConfig } from '../../components/SmartModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, QrCode, Calendar, Image as ImageIcon, 
  Pencil, Trash2, CheckCircle2, Clock 
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hasNoDate, setHasNoDate] = useState(false);
  const [price, setPrice] = useState('');
  const [totalSpots, setTotalSpots] = useState('');
  const [hasNoSpotLimit, setHasNoSpotLimit] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        router.push('/');
      } else {
        setAuthorized(true);
        fetchEvents();
      }
      setIsCheckingAuth(false);
    };

    checkAdmin();
  }, [router]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setHasNoDate(false);
    setPrice('');
    setTotalSpots('');
    setHasNoSpotLimit(false);
    setImage(null);
    setImageError('');
  };

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

    if (imageError) {
      toast.error('Corrija o erro da imagem antes de salvar.');
      return;
    }

    setLoading(true);

    try {
      let image_url = null;

      if (image) {
        const maxSize = 3 * 1024 * 1024;
        if (image.size > maxSize) throw new Error('Imagem excede 3MB.');
        
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
        price: parseFloat(price),
        total_spots: hasNoSpotLimit ? null : parseInt(totalSpots, 10),
      };

      if (image_url) payload.image_url = image_url;

      if (editingId) {
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Evento atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('events')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Evento criado com sucesso!');
      }
      
      resetForm();
      fetchEvents();

    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');

    if (event.event_date) {
      const formattedDate = new Date(event.event_date).toISOString().slice(0, 16);
      setEventDate(formattedDate);
      setHasNoDate(false);
    } else {
      setEventDate('');
      setHasNoDate(true);
    }

    setPrice(event.price.toString());
    
    if (event.total_spots !== null && event.total_spots !== undefined) {
      setTotalSpots(event.total_spots.toString());
      setHasNoSpotLimit(false);
    } else {
      setTotalSpots('');
      setHasNoSpotLimit(true);
    }
    
    setImage(null);
    setImageError('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Evento',
      message: 'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e afetará os ingressos vendidos.',
      confirmText: 'Excluir Evento',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Evento excluído com sucesso.');
      
      if (editingId === id) resetForm();
      
      fetchEvents();
    } catch (error: any) {
      toast.error('Erro ao excluir evento. Verifique se há ingressos vinculados a ele.');
    } finally {
      setIsModalProcessing(false);
      setDialog(null);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 font-medium">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center">
      
      <SmartModal 
        dialog={dialog} 
        onClose={() => setDialog(null)} 
        isProcessing={isModalProcessing} 
      />

      <div className="w-full max-w-4xl space-y-8">

        {/* CABEÇALHO DO PAINEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Painel de Controle</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie a criação de eventos e o controle de portaria.</p>
          </div>
          <Link href="/admin/checkin" passHref>
            <Button className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-gray-900 hover:bg-gray-800 shadow-sm">
              <QrCode className="w-5 h-5 mr-2" />
              Modo Portaria (Check-in)
            </Button>
          </Link>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO/EDIÇÃO */}
        <Card className={`shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden ${editingId ? 'ring-2 ring-blue-500/50 shadow-blue-500/10' : ''}`}>
          <CardHeader className="bg-white border-b border-gray-100 pb-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {editingId ? <><Pencil className="w-5 h-5 text-blue-500" /> Editando Evento</> : <><Calendar className="w-5 h-5 text-blue-500" /> Criar Novo Evento</>}
                </CardTitle>
                <CardDescription className="mt-1">
                  Preencha os detalhes do evento para publicá-lo na plataforma.
                </CardDescription>
              </div>
              {editingId && (
                <Button variant="ghost" onClick={resetForm} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  Cancelar Edição
                </Button>
              )}
            </div>
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
                  className="h-12 rounded-xl"
                  placeholder="Ex: Simpósio de Medicina 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea 
                  id="description"
                  rows={4} 
                  required 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Detalhes sobre o evento, palestrantes, local..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Data e Hora */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="eventDate">Data e Hora</Label>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasNoDate} 
                        onChange={(e) => {
                          setHasNoDate(e.target.checked);
                          if (e.target.checked) setEventDate('');
                        }} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
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
                    className={`h-12 rounded-xl ${hasNoDate ? 'bg-gray-100 text-gray-400' : ''}`}
                  />
                </div>

                {/* Preço */}
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input 
                    id="price"
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="h-12 rounded-xl"
                    placeholder="0.00"
                  />
                </div>

                {/* Vagas Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="totalSpots">Vagas Totais</Label>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasNoSpotLimit} 
                        onChange={(e) => {
                          setHasNoSpotLimit(e.target.checked);
                          if (e.target.checked) setTotalSpots('');
                        }} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
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
                    className={`h-12 rounded-xl ${hasNoSpotLimit ? 'bg-gray-100 text-gray-400' : ''}`}
                    placeholder="Ex: 100"
                  />
                </div>

                {/* Capa do Evento */}
                <div className="space-y-2">
                  <Label htmlFor="image">
                    Capa do Evento {editingId && <span className="text-muted-foreground font-normal ml-1">(Deixe em branco para manter)</span>}
                  </Label>
                  <Input 
                    id="image"
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleImageChange} 
                    className={`h-12 rounded-xl cursor-pointer pt-2.5 ${
                      imageError ? 'border-red-400 bg-red-50 text-red-600' : ''
                    }`}
                  />
                  {imageError ? (
                    <p className="text-xs font-medium text-red-600 animate-in fade-in flex items-center gap-1">
                      {imageError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">JPEG, PNG ou WEBP (Max: 3MB).</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
                  ) : editingId ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Salvar Alterações</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> Publicar Evento</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* LISTA DE EVENTOS PUBLICADOS */}
        <Card className="shadow-md border-0 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 pb-5">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              Eventos Publicados
              <Badge variant="secondary" className="bg-gray-200 text-gray-700 font-bold px-3 py-1">
                {events.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Calendar className="w-12 h-12 text-gray-300" />
                <p>Nenhum evento cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {events.map((evt) => (
                  <li key={evt.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-gray-50/80 transition-colors group">
                    
                    <div className="flex items-center gap-4">
                      {/* Miniatura da Capa */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
                        {evt.image_url ? (
                          <img src={evt.image_url} alt="Capa" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-gray-900 line-clamp-1 text-lg">{evt.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {evt.event_date ? new Date(evt.event_date).toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                          <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                            R$ {evt.price.toFixed(2).replace('.', ',')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleEdit(evt)}
                        className="font-bold h-10 px-4"
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteClick(evt.id)}
                        className="font-bold h-10 px-4 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white shadow-none"
                      >
                        <Trash2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}