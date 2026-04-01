import React from 'react';

export type DialogConfig = {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'success' | 'cpf_conflict' | 'password_recovery';
  title: string;
  message?: string;
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
    icon = <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
  } else if (dialog.type === 'success') {
    iconBg = 'bg-green-100';
    icon = <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
  } else if (dialog.type === 'cpf_conflict') {
    iconBg = 'bg-yellow-100';
    icon = <svg className="h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
  } else if (dialog.type === 'password_recovery') {
    iconBg = 'bg-blue-100';
    icon = <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
  } else {
    iconBg = 'bg-blue-100';
    icon = <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }

  const showCancelButton = ['confirm', 'cpf_conflict', 'password_recovery'].includes(dialog.type);
  const confirmBtnClass = dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center transform transition-all scale-in-95">
        
        {dialog.modalError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4 font-medium animate-in fade-in slide-in-from-top-2">
            {dialog.modalError}
          </div>
        )}

        <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-5 ${iconBg}`}>
          {icon}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{dialog.title}</h3>

        {dialog.type === 'cpf_conflict' ? (
          <>
            <p className="text-sm text-gray-600 mb-2 text-center">
              Identificamos que este CPF já está vinculado à conta <strong>{dialog.conflictEmail}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Confirme o e-mail completo abaixo para receber um link de recuperação de senha.
            </p>
            <input
              type="email"
              placeholder="Digite o e-mail completo..."
              value={dialog.inputValue || ''}
              onChange={dialog.onInputChange}
              className="w-full text-sm py-3 px-4 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 mb-6 transition-colors"
            />
          </>
        ) : dialog.type === 'password_recovery' ? (
          <>
            <p className="text-sm text-gray-600 mb-3 text-center">
              Enviaremos um link de recuperação para o e-mail:
            </p>
            <p className="text-base font-bold text-gray-900 mb-6 text-center bg-gray-50 py-3 rounded-xl border border-gray-200 break-all px-3">
              {dialog.userEmail}
            </p>
            <p className="text-sm text-gray-500 mb-8 text-center">
              Verifique se o endereço está correto antes de confirmar o envio.
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 mb-8">{dialog.message}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          {showCancelButton && (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
          )}
          <button
            onClick={showCancelButton ? dialog.onConfirm : onClose}
            disabled={isProcessing || (dialog.type === 'cpf_conflict' && !dialog.inputValue)}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors text-white shadow-sm disabled:opacity-70 flex justify-center items-center ${confirmBtnClass}`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              showCancelButton ? dialog.confirmText : 'Entendi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}