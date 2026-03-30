"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

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
  const [occupation, setOccupation] = useState<"estudante" | "profissional">("estudante");
  const [birthDate, setBirthDate] = useState("");

  // Estudante
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [course, setCourse] = useState("Medicina");
  const [customCourse, setCustomCourse] = useState("");

  // Profissional
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [specialty, setSpecialty] = useState("");

  const formatBirthDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{4})\d+?$/, '$1');
  };

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
              // Estudante
              university: occupation === "estudante" ? finalUniversity : null,
              course: occupation === "estudante" ? finalCourse : null,
              // Profissional
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
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
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
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF</label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                    <input
                      type="text"
                      required={!isLogin}
                      value={birthDate}
                      onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocupacao"
                        value="estudante"
                        checked={occupation === "estudante"}
                        onChange={(e) => setOccupation(e.target.value as any)}
                        className="w-4 h-4 text-blue-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Estudante</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="ocupacao"
                        value="profissional"
                        checked={occupation === "profissional"}
                        onChange={(e) => setOccupation(e.target.value as any)}
                        className="w-4 h-4 text-blue-600 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Profissional</span>
                    </label>
                  </div>
                </div>

                {occupation === "estudante" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Curso</label>
                      <select
                        required={!isLogin && occupation === "estudante"}
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="" disabled>Selecione seu curso</option>
                        <option value="Medicina">Medicina</option>
                        <option value="Farmácia">Farmácia</option>
                        <option value="Nutrição">Nutrição</option>
                        <option value="Enfermagem">Enfermagem</option>
                        <option value="Fisioterapia">Fisioterapia</option>
                        <option value="Odontologia">Odontologia</option>
                        <option value="Psicologia">Psicologia</option>
                        <option value="Direito">Direito</option>
                        <option value="Engenharia">Engenharia</option>
                        <option value="Administração">Administração</option>
                        <option value="Tecnologia da Informação ou relacionado">Tecnologia da Informação ou relacionado</option>
                        <option value="Arquitetura e Urbanismo">Arquitetura e Urbanismo</option>
                        <option value="Medicina Veterinária">Medicina Veterinária</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    {course === "Outro" && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700">Qual curso?</label>
                        <input
                          type="text"
                          required={!isLogin && occupation === "estudante" && course === "Outro"}
                          value={customCourse}
                          onChange={(e) => setCustomCourse(e.target.value)}
                          placeholder="Digite o nome do seu curso"
                          className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instituição de Ensino</label>
                      <select
                        required={!isLogin && occupation === "estudante"}
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="" disabled>Selecione sua universidade</option>
                        <option value="UFBA">UFBA</option>
                        <option value="UFRB">UFRB</option>
                        <option value="UFOB">UFOB</option>
                        <option value="UNEB">UNEB</option>
                        <option value="UEFS">UEFS</option>
                        <option value="UESC">UESC</option>
                        <option value="UESB">UESB</option>
                        <option value="EBMSP (Bahiana)">EBMSP (Bahiana)</option>
                        <option value="UCSal">UCSal</option>
                        <option value="UNIVASF">UNIVASF</option>
                        <option value="UNIFACS">UNIFACS</option>
                        <option value="UnidomPedro">UnidomPedro</option>
                        <option value="Zarns">Zarns</option>
                        <option value="Estácio">Estácio</option>
                        <option value="Outra">Outra</option>
                      </select>
                    </div>

                    {university === "Outra" && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700">Qual faculdade?</label>
                        <input
                          type="text"
                          required={!isLogin && occupation === "estudante" && university === "Outra"}
                          value={customUniversity}
                          onChange={(e) => setCustomUniversity(e.target.value)}
                          placeholder="Digite o nome da instituição"
                          className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {occupation === "profissional" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Área de Atuação</label>
                      <select
                        required={!isLogin && occupation === "profissional"}
                        value={area}
                        onChange={(e) => {
                          setArea(e.target.value);
                          if (e.target.value !== "Medicina") setSpecialty("");
                        }}
                        className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="" disabled>Selecione sua área</option>
                        <option value="Medicina">Medicina</option>
                        <option value="Farmácia">Farmácia</option>
                        <option value="Nutrição">Nutrição</option>
                        <option value="Enfermagem">Enfermagem</option>
                        <option value="Fisioterapia">Fisioterapia</option>
                        <option value="Odontologia">Odontologia</option>
                        <option value="Psicologia">Psicologia</option>
                        <option value="Direito">Direito</option>
                        <option value="Engenharia">Engenharia</option>
                        <option value="Tecnologia (TI)">Tecnologia (TI)</option>
                        <option value="Administração / Negócios">Administração / Negócios</option>
                        <option value="Outra">Outra</option>
                      </select>
                    </div>

                    {area === "Outra" && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700">Qual Área?</label>
                        <input
                          type="text"
                          required={!isLogin && occupation === "profissional" && area === "Outra"}
                          value={customArea}
                          onChange={(e) => setCustomArea(e.target.value)}
                          placeholder="Digite a sua área de atuação"
                          className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}

                    {area === "Medicina" && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700">Especialidade Médica</label>
                        <select
                          required={!isLogin && occupation === "profissional" && area === "Medicina"}
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        >
                          <option value="" disabled>Selecione sua especialidade</option>
                          <option value="Anestesiologia">Anestesiologia</option>
                          <option value="Cardiologia">Cardiologia</option>
                          <option value="Cirurgia Geral">Cirurgia Geral</option>
                          <option value="Clínica Médica">Clínica Médica</option>
                          <option value="Dermatologia">Dermatologia</option>
                          <option value="Gastroenterologia">Gastroenterologia</option>
                          <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
                          <option value="Medicina de Família">Medicina de Família</option>
                          <option value="Nefrologia">Nefrologia</option>
                          <option value="Oftalmologia">Oftalmologia</option>
                          <option value="Ortopedia e Traumatologia">Ortopedia e Traumatologia</option>
                          <option value="Patologia">Patologia</option>
                          <option value="Pediatria">Pediatria</option>
                          <option value="Psiquiatria">Psiquiatria</option>
                          <option value="Radiologia">Radiologia</option>
                          <option value="Geral / Outra">Geral / Outra</option>
                          <option value="Sem especialidade">Sem especialidade</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              disabled={isLoading}
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
    </main>
  );
}