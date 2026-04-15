'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartModal, { DialogConfig } from '../../../components/SmartModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Briefcase, UserPlus, Trash2, 
  ArrowLeft, Mail, Clock 
} from "lucide-react";

export default function ManageProducersPage() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [producers, setProducers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const fetchProducers = async () => {
    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProducers(data);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        toast.error('Apenas o administrador pode acessar esta área.');
        router.push('/admin');
      } else {
        setAuthorized(true);
        fetchProducers();
      }
      setIsCheckingAuth(false);
    };

    checkAdmin();
  }, [router]);

  const handleAddProducer = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Por favor, insira um e-mail válido (exemplo: contato@produtora.com).');
      return;
    }

    setIsAdding(true);
    try {
      // 1. Salva no banco de dados para controle visual e RLS
      const { error: dbError } = await supabase
        .from('producers')
        .insert({ email: newEmail.toLowerCase().trim() });

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Este produtor já está autorizado.');
        }
        throw dbError;
      }

      // 2. Chama a API para disparar o e-mail de convite nativo do Supabase
      const response = await fetch('/api/invite/producers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail.toLowerCase().trim() 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar o e-mail de convite.');
      }

      toast.success('Produtor autorizado e convite enviado com sucesso!');
      setNewEmail('');
      fetchProducers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autorizar produtor.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (id: string, email: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Revogar Acesso de Produtor',
      message: `Tem certeza que deseja revogar o acesso de ${email}? Ele perderá o acesso ao painel, mas os eventos já criados por ele continuarão ativos.`,
      confirmText: 'Revogar Acesso',
      onConfirm: () => executeRevoke(id)
    });
  };

  const executeRevoke = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { error } = await supabase
        .from('producers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Acesso revogado com sucesso.');
      fetchProducers();
    } catch (error: any) {
      toast.error('Erro ao revogar acesso do produtor.');
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
          <p className="text-gray-500 font-medium">Verificando credenciais de administrador...</p>
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

      <div className="w-full max-w-4xl space-y-8">

        {/* CABEÇALHO */}
        <div className="pt-1 pb-1">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 flex items-center transition-colors w-fit mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Produtores de Eventos</h1>
          <p className="text-gray-500 mt-1">Gerencie quem tem permissão para criar eventos e vender ingressos na sua plataforma.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE ADIÇÃO */}
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" /> 
                  Novo Convite
                </CardTitle>
                <CardDescription>
                  Insira o e-mail do produtor. Um convite de acesso será enviado automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProducer} className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      type="email" 
                      required 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      placeholder="email@produtora.com"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isAdding} 
                    className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 text-white"
                  >
                    {isAdding ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /></>
                    ) : (
                      <>Autorizar e Convidar</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* COLUNA DIREITA: LISTA DE PRODUTORES */}
          <div className="md:col-span-2">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white h-full">
              <CardHeader className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" /> 
                    Produtores Ativos
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 ml-2">
                      {producers.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {producers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <Briefcase className="w-12 h-12 text-gray-200" />
                    <p>Nenhum produtor autorizado no momento.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {producers.map((producer) => (
                      <li key={producer.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-gray-900 truncate">{producer.email}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Convidado em {new Date(producer.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(producer.id, producer.email)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 font-medium shrink-0 self-start sm:self-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Revogar
                        </Button>

                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </main>
  );
}