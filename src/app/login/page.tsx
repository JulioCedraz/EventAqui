"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import PersonalDataFields, { validateCPF } from "../../components/PersonalDataFields";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cpfMessage, setCpfMessage] = useState('');
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [cpfConflictEmail, setCpfConflictEmail] = useState("");
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateStatus, setBirthDateStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [birthDateMessage, setBirthDateMessage] = useState('');
  const [occupation, setOccupation] = useState<"estudante" | "profissional">("estudante");
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [course, setCourse] = useState(""); 
  const [customCourse, setCustomCourse] = useState("");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [specialty, setSpecialty] = useState("");

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

    setIsCheckingEmail(true);
    setErrorMsg("");

    try {
      const { data: exists, error: checkError } = await supabase.rpc("check_email_exists", {
        lookup_email: email,
      });

      if (checkError) throw checkError;

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
          setErrorMsg("Identificamos que já possui um registo! Por favor, insira a sua senha.");
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
      setIsCheckingEmail(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email) {
      setErrorMsg("Por favor, digite o seu e-mail no campo acima primeiro para recuperar a senha.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (recoveryError) {
      setErrorMsg(recoveryError.message);
    } else {
      setSuccessMsg("E-mail de recuperação enviado! Verifique a sua caixa de entrada.");
    }
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (resendError) {
      setErrorMsg("Erro ao reenviar: " + resendError.message);
    } else {
      setSuccessMsg("Novo link enviado com sucesso! Verifique também a pasta de Spam.");
      setNeedsConfirmation(false);
    }
    setIsLoading(false);
  };

  const handleSendRecoveryFromModal = async () => {
    if (!recoveryEmailInput) {
      setModalError("Por favor, digite o seu e-mail completo.");
      return;
    }
    setIsLoading(true);
    setModalError("");
    
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmailInput, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      setModalError("O e-mail digitado não corresponde ou ocorreu uma falha.");
    } else {
      setSuccessMsg("E-mail de recuperação enviado com sucesso! Verifique a sua caixa de entrada e a pasta de Spam.");
      setShowCpfModal(false);
      setRecoveryEmailInput("");
      setCpf("");
      setCpfStatus('idle');
      setCpfMessage('');
      setIsLogin(true);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setNeedsConfirmation(false);

    try {
      if (emailStatus === "invalid") {
        throw new Error("Verifique o e-mail informado antes de prosseguir.");
      }

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            setNeedsConfirmation(true);
            throw new Error("Precisa confirmar seu e-mail antes de entrar. Verifique sua caixa de entrada ou Spam!");
          }
          throw new Error("E-mail ou senha incorretos.");
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((adminEmail) => adminEmail.trim()) || [];

        if (userEmail && admins.includes(userEmail)) {
          router.push("/admin");
        } else {
          router.push("/tickets");
        }
      } else {
        if (cpf && !validateCPF(cpf)) {
          setCpfStatus('invalid');
          setCpfMessage('Corrija o CPF antes de criar a conta.');
          throw new Error("CPF inválido. Verifique os números digitados.");
        }

        if (cpfStatus === 'invalid') {
          throw new Error("Não é possível prosseguir com um CPF inválido ou já cadastrado.");
        }

        if (birthDateStatus === 'invalid') {
          throw new Error("Corrija a sua data de nascimento antes de prosseguir.");
        }

        const finalUniversity = university === "Outra" ? customUniversity : university;
        const finalArea = area === "Outra" ? customArea : area;
        const finalCourse = course === "Outro" ? customCourse : course;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              cpf: cpf,
              occupation: occupation,
              birth_date: birthDate,
              university: occupation === "estudante" ? finalUniversity : null,
              course: occupation === "estudante" ? finalCourse : null,
              area: occupation === "profissional" ? finalArea : null,
              specialty: occupation === "profissional" && finalArea === "Medicina" ? specialty : null,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
          setErrorMsg("Este e-mail já está em uso. Por favor, faça login.");
          setIsLogin(true);
          return;
        }

        setSuccessMsg("Quase lá! Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8 relative">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          {isLogin ? "Acesse sua conta" : "Crie a sua conta"}
        </h2>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md transition-all duration-300">
        <div className="bg-white py-6 px-6 shadow-sm rounded-2xl border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in">
                {errorMsg}
                {needsConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    className="mt-3 w-full py-2 px-4 border border-red-200 rounded-lg text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                  >
                    Reenviar link de confirmação
                  </button>
                )}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-100 text-green-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
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
                    emailStatus === "valid" ? "border-green-400 bg-green-50" : emailStatus === "invalid" ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                />
                {isCheckingEmail && <span className="absolute right-3 top-3 text-xs text-gray-400">Verificando...</span>}
                {!isCheckingEmail && emailStatus === "valid" && (
                  <svg className="absolute right-3 top-3 w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {emailMessage && (
                <p className={`mt-1.5 text-sm font-medium animate-in fade-in ${emailStatus === "valid" ? "text-green-600" : "text-red-600"}`}>
                  {emailMessage}
                </p>
              )}
            </div>

            {!isLogin && (
              <PersonalDataFields
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName} setLastName={setLastName}
                cpf={cpf} setCpf={setCpf}
                cpfStatus={cpfStatus} setCpfStatus={setCpfStatus}
                cpfMessage={cpfMessage} setCpfMessage={setCpfMessage}
                
                onCpfExists={(maskedEmail) => {
                  setCpfConflictEmail(maskedEmail);
                  setShowCpfModal(true);
                }}

                birthDate={birthDate} setBirthDate={setBirthDate}
                birthDateStatus={birthDateStatus} setBirthDateStatus={setBirthDateStatus}
                birthDateMessage={birthDateMessage} setBirthDateMessage={setBirthDateMessage}
                occupation={occupation} setOccupation={setOccupation}
                course={course} setCourse={setCourse}
                customCourse={customCourse} setCustomCourse={setCustomCourse}
                university={university} setUniversity={setUniversity}
                customUniversity={customUniversity} setCustomUniversity={setCustomUniversity}
                area={area} setArea={setArea}
                customArea={customArea} setCustomArea={setCustomArea}
                specialty={specialty} setSpecialty={setSpecialty}
              />
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handlePasswordRecovery}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || (!isLogin && cpfStatus === 'invalid')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all active:scale-[0.98]"
            >
              {isLoading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
                setSuccessMsg("");
                setEmailStatus("idle");
                setEmailMessage("");
                setNeedsConfirmation(false);
              }}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              {isLogin ? "Ainda não tem conta? Cadastre-se" : "Já tem uma conta? Fazer login"}
            </button>
          </div>
        </div>
      </div>

      {showCpfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            
            {modalError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4 font-medium animate-in fade-in">
                {modalError}
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">CPF já cadastrado</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              Identificamos que este CPF já está vinculado à conta <strong>{cpfConflictEmail}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-4 text-justify">
              Para sua segurança, não é possível criar duas contas com o mesmo documento. Se esta conta for sua, confirme o e-mail completo abaixo para receber um link de recuperação de senha.
            </p>

            <input
              type="email"
              placeholder="Digite o e-mail completo..."
              value={recoveryEmailInput}
              onChange={(e) => setRecoveryEmailInput(e.target.value)}
              className="w-full text-sm py-2.5 px-4 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 mb-6"
            />
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowCpfModal(false);
                  setCpf('');
                  setCpfStatus('idle');
                  setCpfMessage('');
                  setRecoveryEmailInput("");
                  setModalError("");
                }} 
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button 
                type="button"
                onClick={handleSendRecoveryFromModal} 
                disabled={isLoading || !recoveryEmailInput}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Recuperar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}