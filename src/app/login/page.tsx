"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false);

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState <"idle" | "valid" | "invalid"> ("idle");
  const [emailMessage, setEmailMessage] = useState("");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [cpf, setCpf] = useState("");
  const [ocupacao, setOcupacao] = useState< "estudante" | "profissional" > ( "estudante" );

  const handleEmailBlur = async () => {
    setEmailStatus("idle");
    setEmailMessage("");

    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus("invalid");
      setEmailMessage("Por favor, digite um e-mail válido (ex: seu.nome@email.com).");
      return;
    }

    setCheckingEmail(true);
    setErro("");

    try {
      const { data: exists, error } = await supabase.rpc("check_email_exists", {
        lookup_email: email,
      });

      if (error) throw error;

      if (isLogin) {
        if (exists) {
          setEmailStatus("valid");
          setEmailMessage("E-mail encontrado.");
        } else {
          setEmailStatus("invalid");
          setEmailMessage("E-mail não cadastrado. Por favor, crie uma conta.");
        }
      } else {
        if (exists) {
          setErro("Identificamos que já possui um registo! Por favor, insira a sua senha.");
          setIsLogin(true);
          setEmailStatus("valid");
          setEmailMessage("E-mail encontrado.");
        } else {
          setEmailStatus("valid");
          setEmailMessage("E-mail disponível para cadastro.");
        }
      }
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRecuperarSenha = async () => {
    if (!email) {
      setErro(
        "Por favor, digite o seu e-mail no campo acima primeiro para recuperar a senha.",
      );
      return;
    }
    setLoading(true);
    setErro("");
    setSucesso("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErro(error.message);
    } else {
      setSucesso(
        "E-mail de recuperação enviado! Verifique a sua caixa de entrada.",
      );
    }
    setLoading(false);
  };

  const handleReenviarConfirmacao = async () => {
    setLoading(true);
    setErro("");
    setSucesso("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      setErro("Erro ao reenviar: " + error.message);
    } else {
      setSucesso(
        "Novo link enviado com sucesso! Verifique também a pasta de Spam.",
      );
      setPrecisaConfirmar(false);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");
    setPrecisaConfirmar(false);

    try {
      if (emailStatus === "invalid") {
        throw new Error("Verifique o e-mail informado antes de prosseguir.");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setPrecisaConfirmar(true);
            throw new Error(
              "Precisa de confirmar o seu e-mail antes de entrar. Verifique a sua caixa de entrada ou Spam!",
            );
          }
          throw new Error("E-mail ou senha incorretos.");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        const admins =
          process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((email) =>
            email.trim(),
          ) || [];

        if (userEmail && admins.includes(userEmail)) {
          router.push("/admin");
        } else {
          router.push("/tickets");
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              first_name: nome,
              last_name: sobrenome,
              cpf: cpf || null,
              occupation: ocupacao,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (
          data.user &&
          data.user.identities &&
          data.user.identities.length === 0
        ) {
          setErro("Este e-mail já está em uso. Por favor, faça login.");
          setIsLogin(true);
          return;
        }

        setSucesso(
          "Quase lá! Enviámos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.",
        );
        setIsLogin(true);
        setSenha("");
      }
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          {isLogin ? "Acesse sua conta" : "Crie a sua conta"}
        </h2>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md transition-all duration-300">
        <div className="bg-white py-6 px-6 shadow-sm rounded-2xl border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {erro && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in">
                {erro}
                {precisaConfirmar && (
                  <button
                    type="button"
                    onClick={handleReenviarConfirmacao}
                    className="mt-3 w-full py-2 px-4 border border-red-200 rounded-lg text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                  >
                    Reenviar link de confirmação
                  </button>
                )}
              </div>
            )}
            {sucesso && (
              <div className="bg-green-50 border border-green-100 text-green-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in">
                {sucesso}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailStatus !== "idle") {
                      setEmailStatus("idle");
                      setEmailMessage("");
                    }
                  }}
                  onBlur={handleEmailBlur}
                  className={`block w-full px-4 py-2.5 border rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors ${
                    emailStatus === "valid"
                      ? "border-green-400 bg-green-50"
                      : emailStatus === "invalid"
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                  }`}
                />
                {checkingEmail && (
                  <span className="absolute right-3 top-3 text-xs text-gray-400">
                    A verificar...
                  </span>
                )}
                {!checkingEmail && emailStatus === "valid" && (
                  <svg
                    className="absolute right-3 top-3 w-5 h-5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              {emailMessage && (
                <p
                  className={`mt-1.5 text-sm font-medium animate-in fade-in ${
                    emailStatus === "valid" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {emailMessage}
                </p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sobrenome
                    </label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CPF{" "}
                    <span className="text-gray-400 font-normal">
                      (Opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ocupação:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocupacao"
                        value="estudante"
                        checked={ocupacao === "estudante"}
                        onChange={(e) => setOcupacao(e.target.value as any)}
                        className="w-4 h-4 text-blue-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Estudante
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocupacao"
                        value="profissional"
                        checked={ocupacao === "profissional"}
                        onChange={(e) => setOcupacao(e.target.value as any)}
                        className="w-4 h-4 text-blue-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Profissional
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleRecuperarSenha}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all active:scale-[0.98]"
            >
              {loading ? "A processar..." : isLogin ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErro("");
                setSucesso("");
                setEmailStatus("idle");
                setEmailMessage("");
                setPrecisaConfirmar(false);
              }}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              {isLogin
                ? "Ainda não tem conta? Cadastre-se"
                : "Já tem uma conta? Fazer login"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
