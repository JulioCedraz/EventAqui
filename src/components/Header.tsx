"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, UserCircle, Ticket, LogOut, ShieldAlert, Info, ScanBarcode } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasPanelAccess, setHasPanelAccess] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkRoles = async (currentUser: any) => {
      if (!currentUser?.email) {
        setHasPanelAccess(false);
        setIsAgent(false);
        setLoading(false);
        return;
      }

      const email = currentUser.email;

      // Busca credenciais em paralelo para maior velocidade
      const [producerRes, agentRes] = await Promise.all([
        supabase.from('authorized_producers').select('email').eq('email', email).maybeSingle(),
        supabase.from('agents').select('email').eq('email', email).maybeSingle()
      ]);

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      const isAdmin = admins.includes(email);

      setHasPanelAccess(isAdmin || !!producerRes.data);
      setIsAgent(!!agentRes.data);
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
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO E NAVEGAÇÃO DESKTOP */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-extrabold text-blue-600 tracking-tighter hover:opacity-80 transition-opacity">
              EventAqui
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link href="/sobre" passHref>
                <Button variant="ghost" className="text-gray-600 hover:text-blue-600 font-medium">Sobre Nós</Button>
              </Link>

              {!loading && hasPanelAccess && (
                <Link href="/admin" passHref>
                  <Button variant="ghost" className="text-gray-500 hover:text-gray-900 gap-2">
                    <ShieldAlert className="w-4 h-4" /> Painel
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          {/* AÇÕES DO USUÁRIO */}
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link href="/profile" passHref className="hidden sm:block">
                      <Button variant="ghost" className="text-gray-600 hover:text-blue-600 gap-2">
                        <UserCircle className="w-5 h-5" /> Meu Perfil
                      </Button>
                    </Link>

                    {/* Para agentes, 'Meus Ingressos' não aparece em destaque */}
                    <Link href="/tickets" passHref className={isAgent ? "hidden sm:block" : "block"}>
                      <Button className="bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-none font-bold gap-2 rounded-full">
                        <Ticket className="w-4 h-4" /> Meus Ingressos
                      </Button>
                    </Link>

                    {/* Para agentes: 'Scanner' em destaque. */}
                    {isAgent && (
                      <Link href="/admin/checkin" passHref>
                        <Button className="bg-purple-50 text-purple-600 hover:bg-purple-100 shadow-none font-bold gap-2 rounded-full">
                          <ScanBarcode className="w-4 h-4" /> Scanner
                        </Button>
                      </Link>
                    )}

                    <Button variant="ghost" onClick={handleSignOut} className="hidden sm:flex text-red-500 px-3">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Link href="/login" passHref>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-6">Entrar</Button>
                  </Link>
                )}
              </>
            )}

            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gray-600">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg">
          <nav className="px-4 pt-2 pb-6 space-y-1">
            <Link href="/sobre" passHref>
              <Button variant="ghost" className="w-full justify-start text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                <Info className="w-4 h-4 mr-3 text-gray-400" /> Sobre Nós
              </Button>
            </Link>
            
            {!loading && (
              <>
                {hasPanelAccess && (
                  <Link href="/admin" passHref>
                    <Button variant="ghost" className="w-full justify-start text-gray-700 font-medium" onClick={() => setIsMenuOpen(false)}>
                      <ShieldAlert className="w-4 h-4 mr-3 text-gray-400" /> Painel Administrativo
                    </Button>
                  </Link>
                )}
                {(hasPanelAccess || isAgent) && (
                  <Link href="/admin/checkin" passHref>
                    <Button variant="ghost" className="w-full justify-start text-purple-600 font-bold bg-purple-50/50 hover:bg-purple-100 mt-1" onClick={() => setIsMenuOpen(false)}>
                      <ScanBarcode className="w-4 h-4 mr-3" /> Modo Portaria (Scanner)
                    </Button>
                  </Link>
                )}
              </>
            )}

            {user && (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <Link href="/profile" passHref>
                  <Button variant="ghost" className="w-full justify-start text-gray-700" onClick={() => setIsMenuOpen(false)}>
                    <UserCircle className="w-4 h-4 mr-3 text-gray-400" /> Meu Perfil
                  </Button>
                </Link>
                
                <Link href="/tickets" passHref>
                  <Button variant="ghost" className="w-full justify-start text-gray-700" onClick={() => setIsMenuOpen(false)}>
                    <Ticket className="w-4 h-4 mr-3 text-gray-400" /> Meus Ingressos
                  </Button>
                </Link>
                
                <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-red-500">
                  <LogOut className="w-4 h-4 mr-3" /> Sair da Conta
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}