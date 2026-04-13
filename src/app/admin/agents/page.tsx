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
  Loader2, ShieldCheck, UserPlus, Trash2, 
  ArrowLeft, Mail, Clock 
} from "lucide-react";

export default function ManageAgentsPage() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const [userContext, setUserContext] = useState<{isAdmin: boolean, uid: string} | null>(null);

  const fetchAgents = async (context = userContext) => {
    if (!context) return;

    let query = supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!context.isAdmin) {
      query = query.eq('producer_id', context.uid);
    }

    const { data, error } = await query;
    if (!error && data) {
      setAgents(data);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const currentUserId = session?.user?.id;
      
      if (!session || !userEmail) {
        toast.error('Por favor, faça login para acessar esta página.', { id: 'login-required' });
        router.push('/');
        return;
      }

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const isAdmin = admins.includes(userEmail);

      let isProducer = false;
      if (!isAdmin) {
        const { data: producer } = await supabase
          .from('authorized_producers')
          .select('email')
          .eq('email', userEmail)
          .maybeSingle();
          
        if (producer) isProducer = true;
      }

      // 3. Bloqueia se não tiver permissão
      if (!isAdmin && !isProducer) {
        toast.error('Você não tem permissão para acessar esta área.', { id: 'unauthorized-agents' });
        router.push('/');
        return;
      }

      // Libera acesso e busca os dados
      const context = { isAdmin, uid: currentUserId };
      setUserContext(context);
      setAuthorized(true);
      setIsCheckingAuth(false);
      
      fetchAgents(context);
    };

    checkAuthAndLoadData();
  }, [router]);

  const handleAddAgent = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    if (!userContext) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Por favor, insira um e-mail válido.');
      return;
    }

    setIsAdding(true);
    try {
      // 1. Salva no banco de dados para controle visual e RLS
      const { error: dbError } = await supabase
        .from('agents')
        .insert({ 
          email: newEmail.toLowerCase().trim(),
          producer_id: userContext.uid
        });

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Este agente já faz parte da sua equipe.');
        }
        throw dbError;
      }

      // 2. Chama a API para disparar o e-mail de convite nativo do Supabase
      const response = await fetch('/api/invite/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail.toLowerCase().trim(),
          producerId: userContext.uid 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar o e-mail de convite.');
      }
      if (result.alreadyExists) {
      toast.success('Este agente já possui conta e foi adicionado à sua equipe!');
    } else {
      toast.success('Agente autorizado e convite enviado com sucesso!');
    }
      setNewEmail('');
      fetchAgents();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autorizar agente.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (id: string, email: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Revogar Acesso',
      message: `Tem certeza que deseja remover ${email} da sua equipe de portaria?`,
      confirmText: 'Revogar Acesso',
      onConfirm: () => executeRevoke(id)
    });
  };

  const executeRevoke = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Acesso revogado com sucesso.');
      fetchAgents();
    } catch (error: any) {
      toast.error('Erro ao revogar acesso.');
    } finally {
      setIsModalProcessing(false);
      setDialog(null);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Equipe de Portaria</h1>
          <p className="text-gray-500 mt-1">Autorize funcionários a escanear ingressos dos seus eventos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE ADIÇÃO */}
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" /> 
                  Novo Agente
                </CardTitle>
                <CardDescription>
                  Insira o e-mail do funcionário para liberar o app de scanner.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAgent} className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      type="email" 
                      required 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      placeholder="email@exemplo.com"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isAdding} 
                    className="w-full h-12 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 text-white"
                  >
                    {isAdding ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /></>
                    ) : (
                      <>Adicionar à Equipe</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* COLUNA DIREITA: LISTA DE AGENTES */}
          <div className="md:col-span-2">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white h-full">
              <CardHeader className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" /> 
                    Sua Equipe
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 ml-2">
                      {agents.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {agents.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <ShieldCheck className="w-12 h-12 text-gray-200" />
                    <p>Nenhum agente cadastrado na sua equipe.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {agents.map((agent) => (
                      <li key={agent.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-gray-900 truncate">{agent.email}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Adicionado em {new Date(agent.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(agent.id, agent.email)}
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