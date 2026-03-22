'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-extrabold text-blue-600 tracking-tighter hover:opacity-80 transition-opacity">
              EventAqui
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/sobre" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">
                Sobre Nós
              </Link>

              {!loading && user && (
                <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  Painel Administrativo
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    <Link href="/profile" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Meu Perfil</span>
                    </Link>

                    <Link href="/tickets" className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap">
                      Meus Ingressos
                    </Link>
                    
                    <button 
                      onClick={handleSignOut}
                      className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors hidden sm:block"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm font-medium text-white bg-blue-600 px-5 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm">
                      Entrar
                    </Link>
                  </div>
                )}
              </>
            )}

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ====== MENU MOBILE ====== */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-gray-100 bg-gray-50`}>
        <nav className="px-4 pt-4 pb-6 space-y-3 shadow-inner">
          <Link href="/sobre" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 font-medium p-2 rounded-md transition-colors">
            Sobre Nós
          </Link>
          {!loading && user && (
            <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 font-medium p-2 rounded-md transition-colors">
              Painel Administrativo
            </Link>
          )}
          
          {user && (
            <>
              <div className="border-t border-gray-200 my-2 pt-2"></div>
              
              <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 font-medium p-2 rounded-md transition-colors">
                Meu Perfil
              </Link>
              <Link href="/tickets" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 font-medium p-2 rounded-md  transition-colors">
                Meus Ingressos
              </Link>
              <button 
                onClick={handleSignOut}
                className="block w-full text-left text-red-500 font-medium p-2 rounded-md  transition-colors"
              >
                Sair da Conta
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}