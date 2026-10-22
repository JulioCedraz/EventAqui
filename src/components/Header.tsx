"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { fetchOwnRole, PANEL_ROLES, SCANNER_ROLES } from "@/lib/roles";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Menu, X, UserCircle, Ticket, LogOut, ShieldAlert, ScanBarcode, Sun, Moon } from "lucide-react";
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasPanelAccess, setHasPanelAccess] = useState(false);
  const [hasScannerAccess, setHasScannerAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setTheme, resolvedTheme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const toggleButton = document.getElementById("mobile-menu-toggle");
        if (toggleButton && toggleButton.contains(event.target as Node)) return;
        
        setIsMenuOpen(false);
      }
    }

    const closeMenu = () => setIsMenuOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    if (isMenuOpen) window.addEventListener("scroll", closeMenu, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", closeMenu);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const checkRoles = async (currentUser: User | null | undefined) => {
      if (!currentUser?.id) {
        setHasPanelAccess(false);
        setHasScannerAccess(false);
        setLoading(false);
        return;
      }

      const role = await fetchOwnRole(currentUser.id);

      setHasPanelAccess(PANEL_ROLES.includes(role));
      setHasScannerAccess(SCANNER_ROLES.includes(role));
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

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme === systemTheme ? "system" : nextTheme);
  };

  // A landing tem header próprio
  if (pathname === "/como-funciona") return null;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="relative z-20 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-gray-200 dark:border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            <div className="shrink-0">
              <Link href="/" className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tighter hover:opacity-80 transition-opacity">
                EventAqui
              </Link>
            </div>

            <nav className="hidden min-[570px]:flex flex-1 justify-center items-center gap-0.5 mx-2">
              {!loading && user && (
                <>
                  {hasPanelAccess && (
                    <Link href="/admin" passHref className="hidden min-[740px]:flex">
                      <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 gap-2 font-medium px-3">
                        <ShieldAlert className="w-4 h-4" /> Painel
                      </Button>
                    </Link>
                  )}

                  {hasScannerAccess && (
                    <Link href="/admin/checkin" passHref className="hidden min-[740px]:flex">
                      <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 gap-2 font-medium px-3">
                        <ScanBarcode className="w-4 h-4" /> Scanner
                      </Button>
                    </Link>
                  )}

                  <Link href="/tickets" passHref className="hidden min-[570px]:flex">
                    <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 gap-2 font-medium px-3">
                      <Ticket className="w-4 h-4" /> Meus Ingressos
                    </Button>
                  </Link>

                  <Link href="/profile" passHref className="hidden min-[570px]:flex">
                    <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 gap-2 font-medium px-3">
                      <UserCircle className="w-4 h-4" /> Meu Perfil
                    </Button>
                  </Link>
                </>
              )}
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              
              {mounted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mr-1"
                  title="Alternar tema"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              ) : (
                <div className="w-9 h-9 mr-1" />
              )}

              {!loading && (
                <>
                  {user ? (
                    <Button 
                      variant="ghost" 
                      onClick={handleSignOut} 
                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 px-3 font-bold gap-2"
                    >
                      <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sair</span>
                    </Button>
                  ) : (
                    <Link href="/login" passHref>
                      <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-full px-6">
                        Entrar
                      </Button>
                    </Link>
                  )}
                </>
              )}

              <Button 
                id="mobile-menu-toggle"
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMenuOpen}
                className="relative min-[740px]:hidden text-gray-600 dark:text-gray-300"
              >
                <Menu
                  className={`absolute h-6 w-6 transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
                  }`}
                />
                <X
                  className={`absolute h-6 w-6 transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
                  }`}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div 
        ref={menuRef}
        className={`absolute top-full left-0 w-full z-10 border-b border-gray-100 dark:border-border bg-white dark:bg-background shadow-lg transition-all duration-300 ease-in-out min-[740px]:hidden ${
          isMenuOpen 
            ? "translate-y-0 opacity-100 visible" 
            : "-translate-y-full opacity-0 invisible"
        }`}
      >
        <nav className="px-4 pt-2 pb-6 space-y-1">
          {!loading && user && (
            <>
              {hasPanelAccess && (
                <Link href="/admin" passHref>
                  <Button variant="ghost" className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium" onClick={() => setIsMenuOpen(false)}>
                    <ShieldAlert className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" /> Painel Administrativo
                  </Button>
                </Link>
              )}
              
              {hasScannerAccess && (
                <Link href="/admin/checkin" passHref>
                  <Button variant="ghost" className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium" onClick={() => setIsMenuOpen(false)}>
                    <ScanBarcode className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" /> Scanner (Validação de ingressos)
                  </Button>
                </Link>
              )}

              <Link href="/tickets" passHref>
                <Button variant="ghost" className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium" onClick={() => setIsMenuOpen(false)}>
                  <Ticket className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" /> Meus Ingressos
                </Button>
              </Link>

              <Link href="/profile" passHref>
                <Button variant="ghost" className="w-full justify-start text-left text-gray-700 dark:text-gray-300 font-medium" onClick={() => setIsMenuOpen(false)}>
                  <UserCircle className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" /> Meu Perfil
                </Button>
              </Link>
              
              <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-left text-red-500 dark:text-red-400 font-bold">
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
    </header>
  );
}