import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Info, 
  Loader2 
} from "lucide-react";

export type DialogConfig = {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'success' | 'cpf_conflict' | 'password_recovery';
  title: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  onConfirm?: () => Promise<void> | void;
  
  conflictEmail?: string;
  userEmail?: string;
  inputValue?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  modalError?: string;
};

interface SmartModalProps {
  dialog: DialogConfig | null;
  onClose: () => void;
  isProcessing?: boolean;
}

export default function SmartModal({ dialog, onClose, isProcessing = false }: SmartModalProps) {
  if (!dialog?.isOpen) return null;

  let iconBg = 'bg-blue-100';
  let icon = null;

  if (dialog.type === 'confirm') {
    iconBg = 'bg-red-100';
    icon = <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />;
  } else if (dialog.type === 'success') {
    iconBg = 'bg-green-100';
    icon = <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />;
  } else if (dialog.type === 'cpf_conflict') {
    iconBg = 'bg-yellow-100';
    icon = <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-600" />;
  } else if (dialog.type === 'password_recovery') {
    iconBg = 'bg-blue-100';
    icon = <KeyRound className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />;
  } else {
    iconBg = 'bg-blue-100';
    icon = <Info className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />;
  }

  const showCancelButton = ['confirm', 'cpf_conflict', 'password_recovery'].includes(dialog.type);
  const isDestructive = dialog.type === 'confirm';

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-10 text-center transform transition-all scale-in-95">
        
        {/* Renderização de Erro Interno do Modal */}
        {dialog.modalError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm sm:text-base p-3 rounded-xl mb-5 font-medium animate-in fade-in slide-in-from-top-2">
            {dialog.modalError}
          </div>
        )}

        <div className={`mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full mb-6 ${iconBg}`}>
          {icon}
        </div>
        
        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-4">{dialog.title}</h3>

        {/* Renderização condicional do conteúdo baseada no tipo */}
        {dialog.type === 'cpf_conflict' ? (
          <>
            <p className="text-sm sm:text-base leading-relaxed text-gray-600 mb-3 text-center">
              Identificamos que este CPF já está vinculado à conta <strong className="break-all">{dialog.conflictEmail}</strong>.
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-gray-500 mb-8 text-center">
              Confirme o e-mail completo abaixo para receber um link de recuperação de senha.
            </p>
            <Input
              type="email"
              placeholder="Digite o e-mail completo..."
              value={dialog.inputValue || ''}
              onChange={dialog.onInputChange}
              className="h-12 sm:h-14 text-sm sm:text-base rounded-xl mb-8"
            />
          </>
        ) : dialog.type === 'password_recovery' ? (
          <>
            <p className="text-sm sm:text-base leading-relaxed text-gray-600 mb-3 text-center">
              Enviaremos um link de recuperação para o e-mail:
            </p>
            <p className="text-base sm:text-lg font-bold text-gray-900 mb-6 text-center bg-gray-50 py-3 sm:py-4 rounded-xl border border-gray-200 break-all px-4">
              {dialog.userEmail}
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-gray-500 mb-8 text-center">
              Verifique se o endereço está correto antes de confirmar o envio.
            </p>
          </>
        ) : (
          <p className="text-sm sm:text-base leading-relaxed text-gray-500 mb-8">{dialog.message}</p>
        )}

        {/* Botões */}
        <div className="flex sm:flex-row gap-3 sm:gap-4 justify-center">
          {showCancelButton && (
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-6 sm:py-7 font-bold sm:text-base rounded-xl"
            >
              Voltar
            </Button>
          )}
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={showCancelButton ? dialog.onConfirm : onClose}
            disabled={isProcessing || (dialog.type === 'cpf_conflict' && !dialog.inputValue)}
            className={`flex-1 py-6 sm:py-7 font-bold sm:text-base rounded-xl shadow-sm ${!isDestructive ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando
              </>
            ) : (
              showCancelButton ? dialog.confirmText : 'Entendi'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}