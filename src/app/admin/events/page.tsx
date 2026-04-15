'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartModal, { DialogConfig } from '../../../components/SmartModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Calendar, Image as ImageIcon, 
  Pencil, Trash2, Clock, ArrowLeft, PlusCircle 
} from "lucide-react";

export default function ManageEventsPage() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [userContext, setUserContext] = useState<{isAdmin: boolean, uid: string} | null>(null);

  const fetchEvents = async (context = userContext) => {
    if (!context) return;

    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    // Se não for Admin, filtra apenas os eventos que este produtor criou
    if (!context.isAdmin) {
      query = query.eq('producer_id', context.uid);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const currentUserId = session?.user?.id;

      if (!session || !userEmail || !currentUserId) {
        router.push('/');
        return;
      }

      // 1. Verifica se é Admin
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const isAdmin = admins.includes(userEmail);

      // 2. Verifica se é Produtor Autorizado
      const { data: producer } = await supabase
        .from('producers')
        .select('email')
        .eq('email', userEmail)
        .maybeSingle();

      // Expulsa se não for nenhum dos dois
      if (!isAdmin && !producer) {
        toast.error('Você não tem permissão para acessar esta área.');
        router.push('/');
        return;
      }

      const context = { isAdmin, uid: currentUserId };
      setUserContext(context);
      setAuthorized(true);
      setIsCheckingAuth(false);
      
      // Carrega os eventos imediatamente com o contexto correto
      fetchEvents(context);
    };

    checkAuthAndLoadData();
  }, [router]);

  const handleEdit = (id: string) => {
    router.push(`/admin/events/new?id=${id}`);
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
          <p className="text-gray-500 font-medium">Carregando painel de eventos...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center min-h-screen">
      
      <SmartModal 
        dialog={dialog} 
        onClose={() => setDialog(null)} 
        isProcessing={isModalProcessing} 
      />

      <div className="w-full max-w-5xl space-y-8">

        {/* CABEÇALHO E BOTÃO DE NOVO EVENTO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1 pb-1">
          <div>
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 flex items-center transition-colors w-fit mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gerenciar Eventos</h1>
            <p className="text-gray-500 mt-1">Publique novos eventos, visualize, edite ou exclua os eventos publicados na plataforma.</p>
          </div>
          <Link href="/admin/events/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-6 rounded-xl shadow-sm transition-all hover:scale-105 w-full sm:w-auto">
              <PlusCircle className="w-5 h-5 mr-2" /> Criar Novo Evento
            </Button>
          </Link>
        </div>

        {/* LISTA DE EVENTOS PUBLICADOS */}
        <Card className="shadow-md border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 pb-6">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Eventos Publicados
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-md ml-2">
                  {events.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Lista de todos os eventos ativos no sistema.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-gray-50">
                <Calendar className="w-12 h-12 text-gray-300" />
                <p>Nenhum evento cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {events.map((evt) => (
                  <li key={evt.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-gray-50/80 transition-colors group bg-white">
                    
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

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleEdit(evt.id)}
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