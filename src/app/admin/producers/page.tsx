'use client';

import { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from '@/lib/utils';
import { supabase } from "../../../lib/supabase";
import { ADMIN_ROLES } from "@/lib/roles";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import Link from "next/link";
import SmartModal, { DialogConfig } from "../../../components/SmartModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Briefcase, UserPlus, Trash2, ArrowLeft, Mail, Clock } from "lucide-react";
import { Database } from "../../../types/database.types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ManageProducersPage() {
  const access = useRoleGuard({
    allow: ADMIN_ROLES,
    deniedMessage: "Acesso restrito a administradores.",
    deniedRedirect: "/admin",
    toastId: "unauthorized-producers",
  });
  const [producers, setProducers] = useState<Profile[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const fetchProducers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "producer")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducers(data);
    }
  }, []);

  useEffect(() => {
    const loadProducers = async () => {
      if (access) await fetchProducers();
    };
    loadProducers();
  }, [access, fetchProducers]);

  const handleAddProducer = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Por favor, insira um e-mail válido (exemplo: contato@produtora.com).");
      return;
    }

    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          email: newEmail.toLowerCase().trim(),
          role: 'producer'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar o e-mail de convite.");
      }

      toast.success(result.message || "Produtor autorizado e convite enviado com sucesso!");
      setNewEmail("");
      fetchProducers();
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao autorizar produtor."));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (producer: Profile) => {
    const hasName = producer.first_name || producer.last_name;
    const displayIdentifier = hasName 
      ? `${producer.first_name || ''} ${producer.last_name || ''}`.trim() 
      : (producer.email || 'este usuário');
    
    setDialog({
      isOpen: true,
      type: "confirm",
      title: "Revogar Acesso de Produtor",
      message: <span>Tem certeza que deseja revogar o acesso de <b className="dark:text-gray-100">{displayIdentifier}</b>? Os seus eventos continuarão ativos.</span>,
      confirmText: "Revogar Acesso",
      onConfirm: () => executeRevoke(producer.id),
    });
  };

  const executeRevoke = async (id: string) => {
    setIsModalProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch('/api/revoke', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ targetUserId: id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao revogar acesso.');
      }

      toast.success(result.message || "Acesso revogado com sucesso.");
      fetchProducers();
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao revogar acesso do produtor."));
    } finally {
      setIsModalProcessing(false);
      setDialog(null);
    }
  };

  if (!access) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Verificando credenciais de administrador...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center min-h-screen transition-colors">
      <SmartModal dialog={dialog} onClose={() => setDialog(null)} isProcessing={isModalProcessing} />

      <div className="w-full max-w-4xl space-y-8">
        <div className="pt-1 pb-1">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Produtores de Eventos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 transition-colors">Gerencie quem tem permissão para criar eventos e vender ingressos na sua plataforma.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-md border-0 dark:border dark:border-border rounded-3xl overflow-hidden transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 transition-colors">
                  <UserPlus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Novo Convite
                </CardTitle>
                <CardDescription>Insira o e-mail do produtor. Um convite de acesso será enviado automaticamente.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProducer} className="space-y-4">
                  <Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@produtora.com" className="h-12 rounded-xl transition-colors" />
                  <Button type="submit" disabled={isAdding} className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-md shadow-indigo-600/20 text-white transition-colors">
                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Autorizar e Convidar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="shadow-md border-0 dark:border dark:border-border rounded-3xl overflow-hidden h-full transition-colors">
              <CardHeader className="border-b border-gray-100 dark:border-border pb-4 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 transition-colors">
                    <Briefcase className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Produtores Ativos
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 ml-2 transition-colors">{producers.length}</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {producers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <Briefcase className="w-12 h-12 text-gray-200 dark:text-slate-700 transition-colors" />
                    <p>Nenhum produtor autorizado no momento.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-border transition-colors">
                    {producers.map((producer) => (
                      <li key={producer.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-gray-900 dark:text-gray-100 truncate transition-colors">{producer.email || 'E-mail indisponível'}</p>
                            {(
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5 transition-colors">
                                {`${producer.first_name || ''} ${producer.last_name || ''}`.trim()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 transition-colors">
                              <Clock className="w-3 h-3" /> Desde {producer.created_at ? new Date(producer.created_at).toLocaleDateString("pt-BR") : 'Data desconhecida'}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost" size="sm" onClick={() => handleDeleteClick(producer)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 font-medium shrink-0 self-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> 
                          Revogar
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