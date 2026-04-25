'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, ChevronDown, AlertTriangle, LockKeyhole, Loader2, Trash2, Eye, EyeOff } from "lucide-react";

interface PrivacySettingsProps {
  email: string;
}

export default function PrivacySettings({ email }: PrivacySettingsProps) {
  const router = useRouter();

  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Estados de Segurança e Fluxo
  const [authProvider, setAuthProvider] = useState<string>('email');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToken, setIsSendingToken] = useState(false);
  const [isTokenSent, setIsTokenSent] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const provider = data.user.app_metadata.provider || 'email';
        setAuthProvider(provider);
      }
    };
    fetchProvider();
  }, []);

  const handleSendDeleteToken = async () => {
    setIsSendingToken(true);
    setPasswordError('');
    
    try {
      // 1. Step-Up Authentication (Verificação de Identidade)
      if (authProvider === 'email') {
        if (!currentPassword) {
          setPasswordError('A senha atual é obrigatória.');
          setIsSendingToken(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword
        });

        if (signInError) {
          setPasswordError('Senha incorreta. Tente novamente.');
          setIsSendingToken(false);
          return;
        }
      } else {
        // [FUTURO] Preparado para Login Social (OAuth)
        // const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: authProvider as any });
        // if (oauthError) throw new Error('Erro na reautenticação social.');
      }

      // 2. Disparo do Código de Segurança (OTP)
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw new Error('Erro ao enviar o código de segurança. Tente novamente.');
      
      setIsTokenSent(true);
      toast.success('Código de segurança enviado para o seu e-mail.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSendingToken(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteToken || deleteToken.length < 6) {
      toast.error('Por favor, digite o código de 6 dígitos válido.');
      return;
    }

    setIsDeleting(true);

    try {
      // Confirmação do OTP via Supabase
      const { error: verifyError } = await supabase.auth.updateUser({
        nonce: deleteToken,
        data: { lgpd_deletion_requested: true } 
      });

      if (verifyError) throw new Error('Código inválido ou expirado. Verifique seu e-mail e tente novamente.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch('/api/user/deletion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      // Tratamento especial se o usuário cliente tiver ingressos ou se for um produtor e tiver eventos ativos (Regra de Negócio do Backend)
      if (!response.ok) {
        if (data.code === 'CUSTOMER_HAS_TICKETS' || data.code === 'PRODUCER_ACTIVE_EVENTS') {
           // Implementar o modal de confirmação de perda de ingressos aqui, em breve.
           throw new Error(data.error); 
        }
        throw new Error(data.error || 'Erro interno ao processar a solicitação.');
      }

      await supabase.auth.signOut();
      toast.success(data.message || 'Conta agendada para exclusão com sucesso.');
      router.push('/login');

    } catch (err: any) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setIsTokenSent(false);
    setDeleteToken('');
    setCurrentPassword('');
    setPasswordError('');
  };

  return (
    <>
      <div className="mt-10 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
          className="flex items-center justify-between w-full text-left focus:outline-none group py-2"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <h3 className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Privacidade e Exclusão de Conta</h3>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDangerZoneExpanded ? 'rotate-180' : ''}`} 
          />
        </button>

        {isDangerZoneExpanded && (
          <div className="mt-5 p-5 sm:p-6 bg-red-50 border border-red-100 rounded-xl text-justify animate-in fade-in slide-in-from-top-2 duration-300">
            <h4 className="text-sm font-bold text-red-800 mb-3">
              A segurança das suas informações é a nossa prioridade. Seus dados são protegidos por rigorosos padrões tecnológicos e utilizados exclusivamente para garantir o seu acesso aos eventos. <br /> <br /> 
              Em total respeito a você e à Lei Geral de Proteção de Dados Pessoais (LGPD), o controle sobre a sua conta é absoluto e estará sempre em suas mãos. <br /> <br /> 
              O que acontece ao solicitar a exclusão?
            </h4>
            <ul className="text-sm text-red-700 space-y-2 mb-6 list-disc list-inside">
              <li><strong>Carência de 30 dias:</strong> Sua conta será imediatamente suspensa, mas os dados só serão apagados após 30 dias.</li>
              <li><strong>Acesso revogado:</strong> Você perderá imediatamente o acesso à plataforma e a todos os ingressos.</li>
              <li><strong>Anonimato definitivo:</strong> Após o prazo, seu histórico será desvinculado da sua identidade, e os dados pessoais apagados.</li>
            </ul>
            <p className="text-sm font-medium text-red-800 mb-6">
              Atenção: Ao fim do prazo, esta ação será <span className="underline decoration-red-400 font-bold">irreversível</span>.
            </p>
            
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full sm:w-auto font-bold shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Desejo excluir minha conta
            </Button>
          </div>
        )}
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            
            {!isTokenSent ? (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Agendar Exclusão</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-5 leading-relaxed text-justify">
                  Para agendar a exclusão da sua conta (efetivada em 30 dias), confirme sua identidade. Enviaremos um código de segurança para o seu e-mail logo em seguida.
                </p>

                {/* Bloco de Step-Up Authentication */}
                {authProvider === 'email' ? (
                  <div className="mb-6">
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Digite sua senha atual"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setPasswordError('');
                        }}
                        className={`h-12 rounded-xl text-center tracking-wide pr-12 ${passwordError ? 'border-red-300 focus-visible:ring-red-500' : 'border-gray-200 focus-visible:ring-blue-500'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs font-bold text-red-500 mt-2 text-center animate-in fade-in">{passwordError}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-center">
                    <p className="text-xs font-bold text-blue-800">
                      Sua conta utiliza login social ({authProvider}). Será necessário realizar um re-login para confirmar a exclusão.
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button 
                    variant="secondary"
                    onClick={closeModal} 
                    disabled={isSendingToken} 
                    className="flex-1 h-12 text-base font-bold rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSendDeleteToken} 
                    disabled={isSendingToken} 
                    className="flex-1 h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
                  >
                    {isSendingToken ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verificando</>
                    ) : (
                      'Enviar Código'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <LockKeyhole className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Código de Segurança</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Digite o código de 6 dígitos que enviamos para o seu e-mail (<b className="break-all">{email}</b>) para confirmar a exclusão.
                </p>

                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={deleteToken}
                  onChange={(e) => setDeleteToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-3xl tracking-[0.4em] font-extrabold py-8 rounded-xl focus-visible:ring-red-500 mb-8 bg-gray-50"
                />
                
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <Button 
                    variant="secondary"
                    onClick={closeModal} 
                    disabled={isDeleting} 
                    className="flex-1 font-bold h-12 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteAccount} 
                    disabled={isDeleting || deleteToken.length < 6} 
                    className="flex-1 font-bold h-12 rounded-xl"
                  >
                    {isDeleting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando</>
                    ) : (
                      'Suspender Conta'
                    )}
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}