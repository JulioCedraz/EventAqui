"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { confirmationRedirectUrl, safeNextPath } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SmartModal, { DialogConfig } from "../../components/SmartModal";
import ResendConfirmationButton from "../../components/ResendConfirmationButton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams?.get('next'));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  const handlePasswordRecovery = () => {
    if (!email) {
      setErrorMsg("Por favor, digite o seu e-mail no campo acima primeiro para recuperar a senha.");
      return;
    }
    setShowRecoveryModal(true);
  };

  const confirmPasswordRecovery = async () => {
    setIsModalProcessing(true);

    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setShowRecoveryModal(false);

    if (recoveryError) {
      setDialog({
        isOpen: true,
        type: 'alert',
        title: 'Erro ao Enviar',
        message: recoveryError.message
      });
    } else {
      setDialog({
        isOpen: true,
        type: 'success',
        title: 'E-mail Enviado',
        message: 'E-mail de recuperação enviado! Verifique a sua caixa de entrada e pasta de Spam.'
      });
    }
    
    setIsModalProcessing(false);
  };

  // Chegada pelo link de confirmação do cadastro: confirma, mas não deixa a pessoa logada.
  // Ela entra digitando a senha, para não restar dúvida se já está conectada.
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("confirmado") !== "1") return;

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const linkError = hashParams.get("error_code") || queryParams.get("error_code");

    (async () => {
      // getSession aguarda o Supabase terminar de ler o token do link
      const { data: { session } } = await supabase.auth.getSession();
      window.history.replaceState(null, "", window.location.pathname + (next ? `?next=${encodeURIComponent(next)}` : ""));

      if (linkError || !session) {
        setNeedsConfirmation(true);
        setErrorMsg("Este link de confirmação expirou ou já foi usado. Digite seu e-mail e peça um novo link.");
        return;
      }

      // Encerra só neste navegador a sessão criada pelo link
      await supabase.auth.signOut({ scope: "local" });
      setEmail(session.user.email ?? "");
      setSuccessMsg("E-mail confirmado! Digite sua senha para entrar.");
      passwordRef.current?.focus();
    })();
  }, [next]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setNeedsConfirmation(false);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.code === "email_not_confirmed" || signInError.message.includes("Email not confirmed")) {
          setNeedsConfirmation(true);
          throw new Error("Seu e-mail ainda não foi confirmado. Abra o link que enviamos ou peça um novo abaixo.");
        }
        throw new Error("E-mail ou senha incorretos.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((adminEmail) => adminEmail.trim()) || [];

      if (userEmail && admins.includes(userEmail)) {
        router.push(next || "/admin");
      } else {
        router.push(next || "/tickets");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  let activeDialog: DialogConfig | null = dialog;

  if (showRecoveryModal) {
    activeDialog = {
      isOpen: true,
      type: 'password_recovery',
      title: 'Recuperar Senha',
      userEmail: email,
      confirmText: 'Confirmar Envio',
      onConfirm: confirmPasswordRecovery
    };
  }

  const handleCloseModal = () => {
    setDialog(null);
    setShowRecoveryModal(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      
      <SmartModal 
        dialog={activeDialog} 
        onClose={handleCloseModal} 
        isProcessing={isModalProcessing} 
      />

      <Card className="w-full max-w-md mx-auto shadow-xl shadow-blue-900/5 dark:shadow-none rounded-3xl border-gray-100 dark:border-border dark:bg-card animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out transition-colors">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            Acesse sua conta
          </CardTitle>
          <CardDescription className="text-base mt-2 dark:text-gray-400 transition-colors">
            Insira as suas credenciais para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div role="alert" className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2 transition-colors">
                {errorMsg}
              </div>
            )}
            {needsConfirmation && (
              <ResendConfirmationButton email={email} redirectTo={confirmationRedirectUrl(next)} />
            )}
            {successMsg && (
              <div role="status" className="bg-green-50 dark:bg-emerald-500/10 border border-green-100 dark:border-emerald-500/20 text-green-600 dark:text-emerald-400 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2 transition-colors">
                {successMsg}
              </div>
            )}

            <div className="space-y-2 relative">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg("");
                }}
                className="py-6 rounded-xl transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Senha</Label>
                <Button
                  variant="link"
                  type="button"
                  onClick={handlePasswordRecovery}
                  className="h-auto p-0 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Esqueci minha senha
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="py-6 rounded-xl pr-12 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 rounded-xl text-base text-white font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-blue-600/20 dark:shadow-none transition-all active:scale-[0.98] mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : "Entrar"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-gray-100 dark:border-border pt-6 transition-colors">
          <Link href={next ? `/novo-cadastro?next=${next}` : "/novo-cadastro"} className="w-full text-center">
            <Button
              variant="ghost"
              type="button"
              className="w-full text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              Ainda não tem conta? Cadastre-se
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}