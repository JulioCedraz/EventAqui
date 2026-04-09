'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck, ArrowRight, X, CheckCircle2 } from 'lucide-react';

// Criamos tipos para gerenciar os diferentes estados do Modal
type ModalState = 'none' | 'pending' | 'success';

export default function EmailConfirmationHandler() {
  const [modalState, setModalState] = useState<ModalState>('none');
  const router = useRouter();

  useEffect(() => {
    // Captura os parâmetros da URL
    const hash = window.location.hash;

    // Primeira etapa
    if (hash && hash.includes('message=Confirmation+link+accepted')) {
      setModalState('pending');
      window.history.replaceState(null, '', window.location.pathname);
    } 
    // Segunda etapa
    else if (hash && hash.includes('type=email_change')) {
      setModalState('success');
      // Limpa a URL da mesma forma para não deixar rastros do token de acesso
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleSuccessContinue = () => {
    setModalState('none');
    // Redireciona o usuário para a página onde ele vê os dados dele
    router.push('/profile'); 
  };

  if (modalState === 'none') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in zoom-in-95 duration-300">
        
        {/* Botão de Fechar */}
        <button 
          onClick={() => setModalState('none')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ---------------------------------------------------------------- */}
        {/* MODAL DE ESTADO PENDENTE (Primeira etapa)                        */}
        {/* ---------------------------------------------------------------- */}
        {modalState === 'pending' && (
          <>
            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Quase lá! Falta um passo.
              </h2>
            </div>

            <div className="space-y-4 text-gray-600 text-sm leading-relaxed text-center">
              <p>
                Você acabou de autorizar a mudança de e-mail. Para garantir a segurança da sua conta, <strong>nós enviamos um link para cada e-mail. É necessário confirmar em ambos para prosseguir.</strong>
              </p>
              <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-xl text-left flex gap-3 items-start">
                <ArrowRight className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs font-medium text-justify">
                  Sua conta só será atualizada após clicar nos dois links. Ao confirmar, o seu e-mail anterior será desvinculado e não servirá para acessar esta plataforma.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setModalState('none')}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Entendi, vou verificar.
            </button>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* MODAL DE SUCESSO (Segunda etapa)                                 */}
        {/* ---------------------------------------------------------------- */}
        {modalState === 'success' && (
          <>
            <div className="flex flex-col items-center text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                E-mail Atualizado!
              </h2>
            </div>

            <div className="space-y-4 text-gray-600 text-sm leading-relaxed text-center">
              <p>
                Tudo certo! Sua conta foi vinculada ao seu novo endereço de e-mail.
              </p>
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-center">
                <p className="text-sm font-medium text-gray-700">
                  A partir de agora, utilize o novo e-mail para fazer login no EventAqui.
                </p>
              </div>
            </div>

            <button 
              onClick={handleSuccessContinue}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Acessar meu Perfil
            </button>
          </>
        )}

      </div>
    </div>
  );
}