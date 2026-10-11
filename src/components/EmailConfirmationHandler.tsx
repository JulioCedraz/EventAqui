'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, ArrowRight, X, CheckCircle2 } from 'lucide-react';

type ModalState = 'none' | 'pending' | 'success';

export default function EmailConfirmationHandler() {
  const [modalState, setModalState] = useState<ModalState>('none');
  const router = useRouter();

  // O hash só existe no cliente: precisa ser lido após a montagem
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const hash = window.location.hash;

    // Troca de e-mail: o 1º link volta com 'Confirmation link accepted'; o 2º, com type=email_change
    if (hash && hash.includes('message=Confirmation+link+accepted')) {
      setModalState('pending');
      window.history.replaceState(null, '', window.location.pathname);
    } 
    else if (hash && hash.includes('type=email_change')) {
      setModalState('success');
      // Limpa a URL da mesma forma para não deixar rastros do token de acesso
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSuccessContinue = () => {
    setModalState('none');
    router.push('/profile'); 
  };

  if (modalState === 'none') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 transition-colors">
      <div className="bg-white dark:bg-card rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in zoom-in-95 duration-300 transition-colors border dark:border-border">
        
        <button 
          onClick={() => setModalState('none')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {modalState === 'pending' && (
          <>
            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 transition-colors">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
                Quase lá! Falta um passo.
              </h2>
            </div>

            <div className="space-y-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed text-center transition-colors">
              <p>
                Você acabou de autorizar a mudança de e-mail. Para garantir a segurança da sua conta, <strong className="dark:text-gray-300">nós enviamos um link para cada e-mail. É necessário confirmar em ambos para prosseguir.</strong>
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl text-left flex gap-3 items-start transition-colors">
                <ArrowRight className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-medium text-justify">
                  Sua conta só será atualizada após clicar nos dois links. Ao confirmar, o seu e-mail anterior será desvinculado e não servirá para acessar esta plataforma.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setModalState('none')}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Entendi, vou verificar.
            </button>
          </>
        )}

        {modalState === 'success' && (
          <>
            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 transition-colors">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
                E-mail Atualizado!
              </h2>
            </div>

            <div className="space-y-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed text-center transition-colors">
              <p>
                Tudo certo! Sua conta foi vinculada ao seu novo endereço de e-mail.
              </p>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-xl text-center transition-colors">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  A partir de agora, utilize o novo e-mail para fazer login no EventAqui.
                </p>
              </div>
            </div>

            <button 
              onClick={handleSuccessContinue}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Acessar meu Perfil
            </button>
          </>
        )}

      </div>
    </div>
  );
}