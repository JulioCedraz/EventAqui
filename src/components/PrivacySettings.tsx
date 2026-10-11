'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/utils';
import { callApi } from '@/lib/api-client';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, ChevronDown, AlertTriangle, LockKeyhole, Loader2, Trash2, Eye, EyeOff, Ticket } from "lucide-react";

interface PrivacySettingsProps {
  email: string;
}

type DeletionImpact = { producerBlocked: boolean; futureTickets: number; guests: number };
type DeleteStep = 'abandon' | 'password' | 'token';

const DELETION_API = '/api/user/deletion-request';

export default function PrivacySettings({ email }: PrivacySettingsProps) {
  const router = useRouter();

  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep | null>(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToken, setIsSendingToken] = useState(false);

  // Consulta os bloqueios antes de pedir senha e código, para o usuário não gastar o código à toa
  const handleStartDeletion = async () => {
    setIsCheckingImpact(true);
    try {
      const result = await callApi<DeletionImpact>(DELETION_API, 'GET');

      if (result.producerBlocked) {
        toast.error('Você possui eventos ativos ou futuros. Encerre seus eventos, processe os repasses/estornos e contate o administrador para encerrar sua conta.');
        return;
      }

      setImpact(result);
      setDeleteStep(result.futureTickets > 0 ? 'abandon' : 'password');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível verificar sua conta. Tente novamente.'));
    } finally {
      setIsCheckingImpact(false);
    }
  };

  const handleSendDeleteToken = async () => {
    setIsSendingToken(true);
    setPasswordError('');

    try {
      if (!currentPassword) {
        setPasswordError('A senha atual é obrigatória.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (signInError) {
        setPasswordError('Senha incorreta. Tente novamente.');
        return;
      }

      const { error } = await supabase.auth.reauthenticate();
      if (error) throw new Error('Erro ao enviar o código de segurança. Tente novamente.');

      setDeleteStep('token');
      toast.success('Código de segurança enviado para o seu e-mail.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar o código. Tente novamente.'));
    } finally {
      setIsSendingToken(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteToken || deleteToken.length < 6) {
      toast.error('Por favor, digite o código válido (até 8 dígitos).');
      return;
    }

    setIsDeleting(true);

    try {
      const { error: verifyError } = await supabase.auth.updateUser({
        nonce: deleteToken,
        data: { lgpd_deletion_requested: true }
      });

      if (verifyError) throw new Error('Código inválido ou expirado. Verifique seu e-mail e tente novamente.');

      const data = await callApi<{ message?: string }>(DELETION_API, 'POST', {
        confirmTicketAbandonment: (impact?.futureTickets ?? 0) > 0,
      });

      await supabase.auth.signOut();
      toast.success(data?.message || 'Conta agendada para exclusão com sucesso.');
      router.push('/login');

    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível concluir a exclusão. Tente novamente.'));
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setDeleteStep(null);
    setImpact(null);
    setDeleteToken('');
    setCurrentPassword('');
    setPasswordError('');
  };

  return (
    <>
      <div className="mt-10 pt-6 border-t border-gray-200 dark:border-border transition-colors">
        <button
          type="button"
          onClick={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
          className="flex items-center justify-between w-full text-left focus:outline-none group py-2"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">Privacidade e Exclusão de Conta</h3>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-all duration-200 ${isDangerZoneExpanded ? 'rotate-180' : ''}`} 
          />
        </button>

        {isDangerZoneExpanded && (
          <div className="mt-5 p-5 sm:p-6 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-justify animate-in fade-in slide-in-from-top-2 duration-300 transition-colors">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-3 transition-colors">
              A segurança das suas informações é a nossa prioridade. Seus dados são protegidos por rigorosos padrões tecnológicos e utilizados exclusivamente para garantir o seu acesso aos eventos. <br /> <br /> 
              Em total respeito a você e à Lei Geral de Proteção de Dados Pessoais (LGPD), o controle sobre a sua conta é absoluto e estará sempre em suas mãos. <br /> <br /> 
              O que acontece ao solicitar a exclusão?
            </h4>
            <ul className="text-sm text-red-700 dark:text-red-400/90 space-y-2 mb-6 list-disc list-inside transition-colors">
              <li><strong className="dark:text-red-300">Carência de 30 dias:</strong> Sua conta será imediatamente suspensa, mas os dados só serão apagados após 30 dias.</li>
              <li><strong className="dark:text-red-300">Acesso revogado:</strong> Você perderá imediatamente o acesso à plataforma e a todos os ingressos.</li>
              <li><strong className="dark:text-red-300">Anonimato definitivo:</strong> Após o prazo, seu histórico será desvinculado da sua identidade, e os dados pessoais apagados.</li>
            </ul>
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-6 transition-colors">
              Atenção: Ao fim do prazo, esta ação será <span className="underline decoration-red-400 dark:decoration-red-600 font-bold">irreversível</span>.
            </p>
            
            <Button
              variant="destructive"
              onClick={handleStartDeletion}
              disabled={isCheckingImpact}
              className="w-full sm:w-auto font-bold shadow-sm"
            >
              {isCheckingImpact ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Desejo excluir minha conta
            </Button>
          </div>
        )}
      </div>

      {deleteStep && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in transition-colors">
          <div className="bg-white dark:bg-card border border-transparent dark:border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 transition-colors">
            
            {deleteStep === 'abandon' && impact && (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
                    <Ticket className="w-6 h-6 text-red-600 dark:text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight transition-colors">Ingressos Futuros</h3>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-justify space-y-3 transition-colors">
                  <p>
                    Você tem <b className="dark:text-gray-300">{impact.futureTickets} {impact.futureTickets === 1 ? 'ingresso' : 'ingressos'}</b> para eventos futuros. Ao excluir a conta, você abre mão {impact.futureTickets === 1 ? 'dele' : 'deles'}, <b className="dark:text-gray-300">sem direito a reembolso</b>.
                  </p>
                  {impact.guests > 0 && (
                    <p>
                      {impact.guests === 1 ? 'O convidado que você cadastrou' : `Os ${impact.guests} convidados que você cadastrou`} nesses ingressos também {impact.guests === 1 ? 'perderá' : 'perderão'} o acesso.
                    </p>
                  )}
                  <p>Se reativar a conta dentro de 30 dias, os ingressos continuam com você.</p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    className="flex-1 min-h-14 text-base font-bold rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteStep('password')}
                    className="flex-1 min-h-14 text-base font-bold rounded-xl"
                  >
                    Abrir mão e continuar
                  </Button>
                </div>
              </>
            )}

            {deleteStep === 'password' && (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight transition-colors">Agendar Exclusão</h3>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed text-justify transition-colors">
                  Para agendar a exclusão da sua conta (efetivada em 30 dias), confirme sua identidade. Enviaremos um código de segurança para o seu e-mail logo em seguida.
                </p>

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
                      className={`h-12 rounded-xl text-center tracking-wide pr-12 transition-colors ${passwordError ? 'border-red-300 dark:border-red-500/50 focus-visible:ring-red-500' : 'border-gray-200 dark:border-slate-700/50 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs font-bold text-red-500 dark:text-red-400 mt-2 text-center animate-in fade-in transition-colors">{passwordError}</p>
                  )}
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button 
                    variant="secondary"
                    onClick={closeModal} 
                    disabled={isSendingToken} 
                    className="flex-1 min-h-14 text-base font-bold rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSendDeleteToken} 
                    disabled={isSendingToken} 
                    className="flex-1 min-h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl shadow-sm"
                  >
                    {isSendingToken ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verificando</>
                    ) : (
                      'Enviar Código'
                    )}
                  </Button>
                </div>
              </>
            )}

            {deleteStep === 'token' && (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
                    <LockKeyhole className="w-6 h-6 text-red-600 dark:text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight transition-colors">Código de Segurança</h3>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed transition-colors">
                  Digite o código de segurança que enviamos para o seu e-mail (<b className="break-all dark:text-gray-300">{email}</b>) para confirmar a exclusão.
                </p>

                <Input
                  type="text"
                  maxLength={8}
                  placeholder="00000000"
                  value={deleteToken}
                  onChange={(e) => setDeleteToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-3xl tracking-[0.2em] font-extrabold py-8 rounded-xl focus-visible:ring-red-500 dark:focus-visible:ring-red-400 mb-8 bg-gray-50 dark:bg-slate-900/50 dark:border-slate-700/50 transition-colors"
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