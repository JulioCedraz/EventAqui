export type DialogConfig = {
  isOpen: boolean;
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => Promise<void> | void;
};

interface SmartModalProps {
  dialog: DialogConfig | null;
  onClose: () => void;
  isProcessing?: boolean;
}

export default function SmartModal({ dialog, onClose, isProcessing = false }: SmartModalProps) {
  if (!dialog?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 text-center transform transition-all scale-in-95">
        
        <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-5 ${dialog.type === 'confirm' ? 'bg-red-100' : 'bg-blue-100'}`}>
          {dialog.type === 'confirm' ? (
            <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{dialog.title}</h3>
        <p className="text-sm text-gray-500 mb-8">{dialog.message}</p>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          {dialog.type === 'confirm' && (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
          )}
          <button
            onClick={dialog.type === 'confirm' ? dialog.onConfirm : onClose}
            disabled={isProcessing}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors text-white shadow-sm disabled:opacity-70 flex justify-center items-center ${
              dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              dialog.type === 'confirm' ? dialog.confirmText : 'Entendi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}