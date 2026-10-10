'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { confirmationRedirectUrl } from '@/lib/utils';
import ResendConfirmationButton from '@/components/ResendConfirmationButton';
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Ticket, Gift, CheckCircle2, 
  AlertTriangle, Calendar, 
  User, LogIn, UserPlus, LogOut 
} from "lucide-react";

type GuestInvite = {
  isClaimed: boolean;
  claimedByMe: boolean;
  isPaid: boolean;
  isMismatch: boolean;
  guestEmailHint: string;
  buyerName: string;
  event: { title: string; image_url: string | null; event_date: string | null } | null;
};

export default function ResgatarIngresso() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [guest, setGuest] = useState<GuestInvite | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    if (!hashParams.get('error_code') && !queryParams.get('error_code')) return;

    setLinkExpired(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const fetchSessionAndGuest = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);

        const res = await fetch(`/api/guests/${id}`, {
          headers: activeSession ? { Authorization: `Bearer ${activeSession.access_token}` } : {}
        });

        if (res.ok) setGuest(await res.json());
      } catch (error) {
        console.error('Erro ao buscar link de resgate:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndGuest();
  }, [id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  };

  const handleClaim = async () => {
    if (!session || !guest) return;
    setClaiming(true);

    try {
      // O servidor valida o convidado, emite o ingresso e envia o QR Code por e-mail
      const res = await fetch(`/api/guests/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao resgatar o ingresso. Tente novamente.');

      toast.success('Ingresso resgatado com sucesso! O QR Code também foi enviado para seu e-mail.');
      router.push('/tickets');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao resgatar o ingresso. Tente novamente.');
    } finally {
      setClaiming(false);
    }
  };

  // ==========================================
  // ESTADOS VISUAIS (Loading e Erro)
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-gray-500 font-medium">Buscando seu ingresso...</p>
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4 transition-colors">
        <Card className="max-w-md w-full py-12 text-center shadow-sm dark:bg-card border-0">
          <AlertTriangle className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Link Inválido</h2>
          <p className="text-gray-500 dark:text-gray-400 px-6">
            Não conseguimos encontrar este convite. O link pode estar quebrado ou ter sido cancelado.
          </p>
          <Button onClick={() => router.push('/')} className="mt-8 font-bold" variant="outline">
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  // ==========================================
  // VARIÁVEIS DE EXIBIÇÃO
  // ==========================================
  const event = guest.event;
  const buyerName = guest.buyerName || 'Alguém';
  const isClaimed = guest.isClaimed;
  const isMismatch = Boolean(session && guest.isMismatch);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600 dark:bg-blue-900 rounded-b-[4rem] md:rounded-b-[8rem] z-0"></div>

      <div className="max-w-xl w-full z-10 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* CABEÇALHO */}
        <div className="text-center text-white mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3 drop-shadow-sm">
            {isClaimed ? 'Ingresso Resgatado!' : 'Você ganhou um ingresso!'}
          </h1>
          <p className="text-blue-100 text-lg font-medium">
            {isClaimed 
              ? 'Este ingresso já foi ativado e transferido para uma conta.' 
              : <>{buyerName} comprou uma <strong className="text-white">Casadinha</strong> e reservou essa vaga para você.</>}
          </p>
        </div>

        <Card className="rounded-3xl shadow-xl overflow-hidden border-0 dark:bg-card">
          
          {/* CARD DO EVENTO */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {event?.image_url ? (
                <img src={event.image_url} alt="Capa" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Ticket className="w-10 h-10 text-blue-300 dark:text-slate-600" />
                </div>
              )}
              <div className="flex-1">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 mb-3 border-0">
                  Convite Exclusivo
                </Badge>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                  {event?.title}
                </h3>
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  {event?.event_date ? new Date(event.event_date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : 'Data a definir'}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 md:p-8">
            
            {/* ESTADO 1: JÁ RESGATADO */}
            {isClaimed ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">QR Code Gerado</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  {guest.claimedByMe 
                    ? 'Você já resgatou este convite. Acesse seu painel para ver o QR Code e detalhes da entrada.' 
                    : 'Este ingresso já foi ativado com sucesso por uma conta vinculada.'}
                </p>
                <Button onClick={() => router.push('/tickets')} className="w-full h-14 bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 text-white font-bold text-lg rounded-xl">
                  Acessar Meus Ingressos
                </Button>
              </div>
            ) 
            
            /* ESTADO 2: NÃO LOGADO */
            : !session ? (
              <div className="text-center py-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Quase lá!</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                  Para emitir o seu ingresso no seu nome, você precisa acessar a plataforma.
                </p>

                {linkExpired && (
                  <div className="mb-8 text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl space-y-3 animate-in fade-in transition-colors">
                    <div role="alert" className="flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Seu link de confirmação expirou ou já foi usado.</strong> Digite o e-mail que você cadastrou para receber um novo link. Ao confirmar, você volta direto para cá.
                      </p>
                    </div>
                    <Input
                      type="email"
                      aria-label="E-mail cadastrado"
                      placeholder="seu@email.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value.trim())}
                      className="py-5 rounded-xl bg-white dark:bg-background"
                    />
                    <ResendConfirmationButton email={resendEmail} redirectTo={confirmationRedirectUrl(`/resgatar/${id}`)} />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Se você já confirmou o e-mail, use &quot;Já tenho uma conta&quot; abaixo.
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => router.push(`/novo-cadastro?next=/resgatar/${id}`)} 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-md shadow-blue-600/20"
                  >
                    <UserPlus className="w-5 h-5 mr-2" /> Criar Conta Grátis
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/login?next=/resgatar/${id}`)}
                    className="w-full h-14 font-bold text-lg rounded-xl text-gray-600 dark:text-gray-300"
                  >
                    <LogIn className="w-5 h-5 mr-2" /> Já tenho uma conta
                  </Button>
                </div>
              </div>
            ) 
            
            /* ESTADO 3: LOGADO E PRONTO PARA RESGATAR */
            : (
              <div className="space-y-6">
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <User className="w-4 h-4" /> Conta Conectada
                  </p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-gray-900 dark:text-gray-100 text-lg">
                        {session.user.user_metadata?.first_name || 'Usuário'} {session.user.user_metadata?.last_name || ''}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{session.user.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                      <LogOut className="w-4 h-4 mr-1.5" /> Sair
                    </Button>
                  </div>
                </div>

                {isMismatch ? (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-4 rounded-xl flex gap-3 items-start animate-in zoom-in-95">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800 dark:text-red-400 mb-1">Incompatibilidade de Dados</p>
                      <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                        O e-mail ou CPF desta conta não conferem com os dados que o comprador cadastrou (<strong className="opacity-80">{guest.guestEmailHint}</strong>). 
                        Faça login na conta correta ou peça ao comprador para ajustar suas informações.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={handleClaim} 
                    disabled={claiming || !guest.isPaid}
                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                  >
                    {claiming
                      ? <Loader2 className="w-6 h-6 animate-spin" />
                      : guest.isPaid ? 'Resgatar Meu Ingresso' : 'Aguardando pagamento do comprador'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}