'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function ReactivationGuard() {
  const router = useRouter();
  const [isPendingDeletion, setIsPendingDeletion] = useState(false);
  const [deletionDate, setDeletionDate] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, deletion_scheduled_at')
        .eq('id', session.user.id)
        .single();

      if (profile?.status === 'pending_deletion') {
        setIsPendingDeletion(true);
        if (profile.deletion_scheduled_at) {
          const date = new Date(profile.deletion_scheduled_at);
          setDeletionDate(date.toLocaleDateString('pt-BR'));
        }
      }
      setIsChecking(false);
    };

    checkUserStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');

      const response = await fetch('/api/user/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reativar conta.');
      }

      toast.success('Bem-vindo de volta! Sua conta foi totalmente restaurada.');
      setIsPendingDeletion(false);
      router.refresh();
      
    } catch (error: any) {
      toast.error(error.message);
      setIsReactivating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsPendingDeletion(false);
    router.push('/login');
  };

  if (isChecking || !isPendingDeletion) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-amber-600" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sua conta está inativa</h1>
          <p className="text-gray-500 leading-relaxed">
            Bom te ver de novo! Você solicitou a exclusão desta conta recentemente. 
            Ela está agendada para ser <strong className="text-gray-800">apagada permanentemente em {deletionDate || 'breve'}</strong>.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-left">
          <h3 className="font-bold text-blue-900 mb-2">Mudou de ideia?</h3>
          <p className="text-sm text-blue-800">
            Você pode cancelar a exclusão agora mesmo e restaurar o acesso imediato a todos os seus dados e ingressos.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={handleReactivate}
            disabled={isReactivating}
            className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20"
          >
            {isReactivating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Restaurando Acesso...</>
            ) : (
              <><RefreshCcw className="w-5 h-5 mr-2" /> Reativar Minha Conta</>
            )}
          </Button>
          
          <Button 
            variant="ghost"
            onClick={handleLogout}
            disabled={isReactivating}
            className="w-full h-14 text-base font-bold text-gray-500 hover:text-gray-800 rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-2" /> Sair e Manter Exclusão
          </Button>
        </div>
      </div>
    </div>
  );
}