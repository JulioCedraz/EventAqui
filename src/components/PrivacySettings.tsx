'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, ChevronDown, AlertTriangle, LockKeyhole, Loader2, Trash2 } from "lucide-react";

interface PrivacySettingsProps {
  email: string;
}

export default function PrivacySettings({ email }: PrivacySettingsProps) {
  const router = useRouter();

  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToken, setIsSendingToken] = useState(false);
  const [isTokenSent, setIsTokenSent] = useState(false);

  const handleSendDeleteToken = async () => {
    setIsSendingToken(true);
    
    try {
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
      const { error: verifyError } = await supabase.auth.updateUser({
        nonce: deleteToken,
        data: { lgpd_deletion_requested: true } 
      });

      if (verifyError) throw new Error('Código inválido ou expirado. Verifique seu e-mail e tente novamente.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro interno ao excluir a conta.');

      await supabase.auth.signOut();
      toast.success('Conta excluída com sucesso.');
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
              O que acontece ao excluir sua conta?
            </h4>
            <ul className="text-sm text-red-700 space-y-2 mb-6 list-disc list-inside">
              <li><strong>Dados apagados:</strong> Seu nome, e-mail, CPF e todos os seus demais dados serão removidos permanentemente desta plataforma.</li>
              <li><strong>Acesso revogado:</strong> Você perderá o acesso à plataforma e a todos os ingressos ativos comprados com esta conta.</li>
              <li><strong>Anonimato:</strong> O seu histórico financeiro será mantido exclusivamente para fins de auditoria, mas sem qualquer vínculo com a sua identidade pessoal.</li>
            </ul>
            <p className="text-sm font-medium text-red-800 mb-6">
              Atenção: Esta ação é <span className="underline decoration-red-400 font-bold">irreversível</span>.
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
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Deseja mesmo continuar?</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-5 leading-relaxed text-justify">
                  Todos os seus dados pessoais, históricos de acessos e ingressos ativos serão apagados definitivamente. Se você mudar de ideia futuramente, precisará realizar um novo cadastro. <br /> <br /> 
                  O seu e-mail poderá ser reutilizado nesta plataforma após 24 horas da confirmação de exclusão.
                </p>

                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl mb-8">
                  <p className="text-xs text-yellow-800 font-medium text-center leading-relaxed">
                    Para garantir sua segurança, precisamos enviar um código de confirmação para o seu e-mail antes de prosseguir.
                  </p>
                </div>
                
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
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando</>
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
                    className="flex-1 font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteAccount} 
                    disabled={isDeleting || deleteToken.length < 6} 
                    className="flex-1 font-bold"
                  >
                    {isDeleting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo</>
                    ) : (
                      'Excluir Conta'
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