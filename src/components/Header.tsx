"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, UserCircle, Ticket, LogOut, ShieldAlert, ScanBarcode } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasPanelAccess, setHasPanelAccess] = useState(false);
  const [hasScannerAccess, setHasScannerAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkRoles = async (currentUser: any) => {
      if (!currentUser?.id) {
        setHasPanelAccess(false);
        setHasScannerAccess(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      const role = profile?.role || 'customer';
      const email = currentUser.email;

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      const isAdmin = admins.includes(email || '') || role === 'admin';
      const isProducer = role === 'producer';
      const isAgent = role === 'agent';

      setHasPanelAccess(isAdmin || isProducer);
      setHasScannerAccess(isAdmin || isProducer || isAgent);
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        checkRoles(currentUser);
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      checkRoles(currentUser);
    });

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
    <header className="sticky top-0 z-50 w-full">
      {/* BARRA PRINCIPAL (CAMADA SUPERIOR) */}
      <div className="relative z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* LOGO */}
            <div className="shrink-0">
              <Link href="/" className="text-2xl font-extrabold text-blue-600 tracking-tighter hover:opacity-80 transition-opacity">
                EventAqui
              </Link>
            </div>

            {/* NAVEGAÇÃO CENTRAL (DESKTOP) */}
            <nav className="hidden min-[570px]:flex flex-1 justify-center items-center gap-0.5 mx-2">
              {!loading && user && (
                <>
                  {hasPanelAccess && (
                    <Link href="/admin" passHref className="hidden min-[740px]:flex">
                      <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2 font-medium px-3">
                        <ShieldAlert className="w-4 h-4" /> Painel
                      </Button>
                    </Link>
                  )}

                  {hasScannerAccess && (
                    <Link href="/admin/checkin" passHref className="hidden min-[740px]:flex">
                      <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2 font-medium px-3">
                        <ScanBarcode className="w-4 h-4" /> Scanner
                      </Button>
                    </Link>
                  )}

                  <Link href="/tickets" passHref className="hidden min-[570px]:flex">
                    <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2 font-medium px-3">
                      <Ticket className="w-4 h-4" /> Meus Ingressos
                    </Button>
                  </Link>

                  <Link href="/profile" passHref className="hidden min-[570px]:flex">
                    <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2 font-medium px-3">
                      <UserCircle className="w-4 h-4" /> Meu Perfil
                    </Button>
                  </Link>
                </>
              )}
            </nav>

            {/* AÇÕES DIREITA */}
            <div className="flex items-center gap-2 ml-auto">
              {!loading && (
                <>
                  {user ? (
                    <Button 
                      variant="ghost" 
                      onClick={handleSignOut} 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 font-bold gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sair
                    </Button>
                  ) : (
                    <Link href="/login" passHref>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-6">
                        Entrar
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {/* BOTÃO MENU MOBILE */}
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="min-[740px]:hidden text-gray-600">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MENU MOBILE (CAMADA INFERIOR) */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full z-10 border-b border-gray-100 bg-white shadow-lg animate-in slide-in-from-top duration-300 min-[740px]:hidden">
          <nav className="px-4 pt-2 pb-6 space-y-1">
            {!loading && user && (
              <>
                {hasPanelAccess && (
                  <Link href="/admin" passHref>
                    <Button variant="ghost" className="w-full justify-start text-left text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                      <ShieldAlert className="w-4 h-4 mr-3 text-gray-400" /> Painel Administrativo
                    </Button>
                  </Link>
                )}
                
                {hasScannerAccess && (
                  <Link href="/admin/checkin" passHref>
                    <Button variant="ghost" className="w-full justify-start text-left text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                      <ScanBarcode className="w-4 h-4 mr-3 text-gray-400" /> Scanner (Validação de ingressos)
                    </Button>
                  </Link>
                )}

                <Link href="/tickets" passHref>
                  <Button variant="ghost" className="w-full justify-start text-left text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                    <Ticket className="w-4 h-4 mr-3 text-gray-400" /> Meus Ingressos
                  </Button>
                </Link>

                <Link href="/profile" passHref>
                  <Button variant="ghost" className="w-full justify-start text-left text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                    <UserCircle className="w-4 h-4 mr-3 text-gray-400" /> Meu Perfil
                  </Button>
                </Link>
                
                <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-left text-red-500 font-bold">
                  <LogOut className="w-4 h-4 mr-3" /> Sair
                </Button>
              </>
            )}

            {!loading && !user && (
              <Link href="/login" passHref>
                <Button className="w-full bg-blue-600 text-white font-bold mt-2" onClick={() => setIsMenuOpen(false)}>
                  Entrar
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}