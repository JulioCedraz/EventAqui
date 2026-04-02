"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";

// Importações do shadcn/ui e ícones
import { Button } from "@/components/ui/button";
import { Menu, X, UserCircle, Ticket, LogOut, ShieldAlert, Info } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || null;

      setUser(currentUser);
      setIsAdmin(
        currentUser?.email ? admins.includes(currentUser.email) : false,
      );
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        setIsAdmin(
          currentUser?.email ? admins.includes(currentUser.email) : false,
        );
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO E NAVEGAÇÃO DESKTOP */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-2xl font-extrabold text-blue-600 tracking-tighter hover:opacity-80 transition-opacity"
            >
              EventAqui
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link href="/sobre" passHref>
                <Button variant="ghost" className="text-gray-600 hover:text-blue-600 font-medium">
                  Sobre Nós
                </Button>
              </Link>

              {!loading && isAdmin && (
                <Link href="/admin" passHref>
                  <Button variant="ghost" className="text-gray-500 hover:text-gray-900 gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Painel Administrativo
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          {/* AÇÕES DO USUÁRIO E MENU MOBILE */}
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link href="/profile" passHref className="hidden sm:block">
                      <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2">
                        <UserCircle className="w-5 h-5" />
                        Meu Perfil
                      </Button>
                    </Link>

                    <Link href="/tickets" passHref>
                      <Button className="bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-none font-bold gap-2 rounded-full">
                        <Ticket className="w-4 h-4" />
                        Meus Ingressos
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="hidden sm:flex text-red-500 hover:text-red-700 hover:bg-red-50 px-3"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Link href="/login" passHref>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-6 shadow-sm">
                      Entrar
                    </Button>
                  </Link>
                )}
              </>
            )}

            {/* BOTÃO HAMBÚRGUER (MOBILE) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-600"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE EXPANSÍVEL */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="px-4 pt-2 pb-6 space-y-1">
            <Link href="/sobre" passHref>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <Info className="w-4 h-4 mr-3 text-gray-400" />
                Sobre Nós
              </Button>
            </Link>
            
            {!loading && isAdmin && (
              <Link href="/admin" passHref>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ShieldAlert className="w-4 h-4 mr-3 text-gray-400" />
                  Painel Administrativo
                </Button>
              </Link>
            )}

            {user && (
              <>
                <div className="border-t border-gray-100 my-2"></div>

                <Link href="/profile" passHref>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserCircle className="w-4 h-4 mr-3 text-gray-400" />
                    Meu Perfil
                  </Button>
                </Link>
                
                <Link href="/tickets" passHref>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Ticket className="w-4 h-4 mr-3 text-gray-400" />
                    Meus Ingressos
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  onClick={handleSignOut}
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 font-medium"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sair da Conta
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}