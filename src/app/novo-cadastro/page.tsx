"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import PersonalDataFields, { validateCPF, validateBirthDate, validateCNPJ } from "../../components/PersonalDataFields";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailFieldError, setEmailFieldError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("customer");
  const [profileType, setProfileType] = useState<'PF' | 'PJ'>('PF');
  
  // Estados PF
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cpfMessage, setCpfMessage] = useState('');
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

  // Estados PJ
  const [companyName, setCompanyName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole && ['admin', 'producer', 'agent'].includes(urlRole)) {
      setRole(urlRole);
    }
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setEmailFieldError("");

    try {
      if (profileType === 'PF') {
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
      } else {
        // Validação PJ
        if (cnpj && !validateCNPJ(cnpj)) {
          setCnpjStatus('invalid');
          throw new Error("CNPJ inválido. Verifique os números digitados.");
        }
      }

      const isoBirthDate = birthDate ? birthDate.split('/').reverse().join('-') : null;
      const finalUniversity = university === "Outra" ? customUniversity : university;
      const finalArea = area === "Outra" ? customArea : area;
      const finalCourse = course === "Outro" ? customCourse : course;

      const userMetaData = profileType === 'PF' 
        ? {
            profile_type: 'PF',
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
          }
        : {
            profile_type: 'PJ',
            company_name: companyName,
            trading_name: tradingName,
            full_name: tradingName || companyName,
            cnpj: cnpj,
            role: role, 
          };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetaData,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        setEmailFieldError("Este e-mail já está cadastrado.");
        return;
      }

      setSuccessMsg("Quase lá! Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.");
      setPassword("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      <Card className="w-full max-w-md mx-auto shadow-xl shadow-blue-900/5 dark:shadow-none rounded-3xl border-gray-100 dark:border-border dark:bg-card animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out transition-colors">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
            Crie a sua conta
          </CardTitle>
          <CardDescription className="text-base mt-2 dark:text-gray-400 transition-colors">
            Preencha os dados abaixo para se cadastrar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2 transition-colors">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 dark:bg-emerald-500/10 border border-green-100 dark:border-emerald-500/20 text-green-600 dark:text-emerald-400 text-sm p-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2 transition-colors">
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
                className={`py-6 rounded-xl transition-colors ${
                  emailFieldError ? "border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10" : ""
                }`}
              />
              {emailFieldError && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 transition-colors">
                    {emailFieldError}
                  </p>
                  <Link href="/login" className="self-start mt-1">
                    <Button 
                      variant="link" 
                      type="button" 
                      className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 transition-colors"
                    >
                      Deseja fazer login?
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100 fill-mode-both space-y-6">
              <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl border border-gray-200 dark:border-slate-800 transition-colors">
                <button
                  type="button"
                  onClick={() => setProfileType('PF')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    profileType === 'PF' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => setProfileType('PJ')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    profileType === 'PJ' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Empresa (CNPJ)
                </button>
              </div>

              <PersonalDataFields
                profileType={profileType}
                
                // Props PF
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
                
                // Props PJ
                companyName={companyName} setCompanyName={setCompanyName}
                tradingName={tradingName} setTradingName={setTradingName}
                cnpj={cnpj} setCnpj={setCnpj}
                cnpjStatus={cnpjStatus} setCnpjStatus={setCnpjStatus}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
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
              disabled={isLoading || (profileType === 'PF' ? cpfStatus === 'invalid' : cnpjStatus === 'invalid')}
              className="w-full py-6 rounded-xl text-base text-white font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-blue-600/20 dark:shadow-none transition-all active:scale-[0.98] mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : "Criar Conta"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-gray-100 dark:border-border pt-6 transition-colors">
          <Link href="/login" className="w-full text-center">
            <Button
              variant="ghost"
              type="button"
              className="w-full text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              Já tem uma conta? Faça o login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}