"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import PersonalDataFields, { validateCPF, validateBirthDate } from "../../components/PersonalDataFields";
import SmartModal, { DialogConfig } from "../../components/SmartModal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [emailFieldError, setEmailFieldError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cpfMessage, setCpfMessage] = useState('');
  const [role, setRole] = useState("customer");
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

  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isModalProcessing, setIsModalProcessing] = useState(false);

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('role');
  if (urlRole && ['admin', 'producer', 'agent'].includes(urlRole)) {
    setRole(urlRole);
  }
}, []);

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
    setEmailFieldError("");
    setNeedsConfirmation(false);

    try {
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

        if (!birthDate || !validateBirthDate(birthDate)) {
          setBirthDateStatus('invalid');
          setBirthDateMessage('Data inválida.');
          throw new Error("Corrija a sua data de nascimento antes de prosseguir.");
        }

        const isoBirthDate = birthDate.split('/').reverse().join('-');
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
              full_name: `${firstName} ${lastName}`,
              cpf: cpf,
              occupation: occupation,
              role: role,
              birth_date: isoBirthDate,
              university: occupation === "estudante" ? finalUniversity : null,
              course: occupation === "estudante" ? finalCourse : null,
              area: occupation === "profissional" ? finalArea : null,
              specialty: occupation === "profissional" && finalArea === "Medicina" ? specialty : null,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
          setEmailFieldError("Este e-mail já está cadastrado.");
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
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <SmartModal 
        dialog={activeDialog} 
        onClose={handleCloseModal} 
        isProcessing={isModalProcessing} 
      />

      <Card key={isLogin ? "card-login" : "card-signup"} className="w-full max-w-md mx-auto shadow-xl shadow-blue-900/5 rounded-3xl border-gray-100 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLogin ? "Acesse sua conta" : "Crie a sua conta"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {isLogin ? "Insira as suas credenciais para continuar." : "Preencha os dados abaixo para se cadastrar."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
                {errorMsg}
                {needsConfirmation && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendConfirmation}
                    className="mt-3 w-full border-red-200 text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    Reenviar link de confirmação
                  </Button>
                )}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-100 text-green-600 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
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
                  setEmailFieldError("");
                  setErrorMsg("");
                }}
                className={`py-6 rounded-xl ${
                  emailFieldError ? "border-red-400 focus-visible:ring-red-400 bg-red-50/50" : ""
                }`}
              />
              {emailFieldError && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
                    {emailFieldError}
                  </p>
                  {!isLogin && (
                    <Button 
                      variant="link" 
                      type="button" 
                      className="h-auto p-0 text-xs text-blue-600 self-start"
                      onClick={() => { setIsLogin(true); setEmailFieldError(""); }}
                    >
                      Deseja fazer login?
                    </Button>
                  )}
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100 fill-mode-both">
                <PersonalDataFields
                  firstName={firstName} setFirstName={setFirstName}
                  lastName={lastName} setLastName={setLastName}
                  cpf={cpf} setCpf={setCpf}
                  cpfStatus={cpfStatus} setCpfStatus={setCpfStatus}
                  cpfMessage={cpfMessage} setCpfMessage={setCpfMessage}

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
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Senha</Label>
                {isLogin && (
                  <Button
                    variant="link"
                    type="button"
                    onClick={handlePasswordRecovery}
                    className="h-auto p-0 text-xs font-medium text-blue-600 hover:text-blue-500"
                  >
                    Esqueci minha senha
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="py-6 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
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
              disabled={isLoading || (!isLogin && cpfStatus === 'invalid')}
              className="w-full py-6 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-gray-100 pt-6">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg("");
              setSuccessMsg("");
              setEmailFieldError("");
              setNeedsConfirmation(false);
            }}
            className="text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            {isLogin ? "Ainda não tem conta? Cadastre-se" : "Já tem uma conta? Fazer login"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}