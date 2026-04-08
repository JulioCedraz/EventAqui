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

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('checkin_agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAgents(data);
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
        fetchAgents();
      }
      setIsCheckingAuth(false);
    };

    checkAdmin();
  }, [router]);

  const handleAddAgent = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Por favor, insira um e-mail válido (exemplo: nome@dominio.com).');
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('checkin_agents')
        .insert({ email: newEmail.toLowerCase().trim() });

      if (error) {
        if (error.code === '23505') { // Código de erro do Postgres para violação de UNIQUE
          throw new Error('Este e-mail já está autorizado.');
        }
        throw error;
      }

      toast.success('Agente autorizado com sucesso!');
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
      message: `Tem certeza que deseja revogar o acesso de portaria para ${email}? Ele não poderá mais validar ingressos.`,
      confirmText: 'Revogar Acesso',
      onConfirm: () => executeRevoke(id)
    });
  };

  const executeRevoke = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { error } = await supabase
        .from('checkin_agents')
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
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 font-medium">Verificando permissões...</p>
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Equipe de Portaria</h1>
          <p className="text-gray-500 mt-1">Autorize ou revogue o acesso de usuários ao scanner de ingressos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE ADIÇÃO */}
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" /> 
                  Novo Agente
                </CardTitle>
                <CardDescription>
                  Insira o e-mail do usuário para liberar o acesso ao scanner.
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
                    className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                  >
                    {isAdding ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /></>
                    ) : (
                      <>Autorizar Acesso</>
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
                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> 
                    Agentes Autorizados
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
                    <p>Nenhum agente autorizado no momento.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {agents.map((agent) => (
                      <li key={agent.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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