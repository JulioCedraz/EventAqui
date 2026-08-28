"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import PersonalDataFields, { 
  basePersonalDataSchema, 
  refinePersonalData 
} from "../../components/PersonalDataFields";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";

// ==========================================
// 1. EXTENSÃO DO SCHEMA BASE PARA O CADASTRO
// ==========================================
const signupSchema = basePersonalDataSchema.extend({
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres")
}).superRefine(refinePersonalData);

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("customer");

  // ==========================================
  // 2. CONFIGURAÇÃO DO REACT HOOK FORM
  // ==========================================
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      profileType: 'PF',
      email: '',
      password: '',
      // Inicialização para evitar avisos de uncontrolled input
      firstName: '', lastName: '', cpf: '', birthDate: '', phone: '',
      semester: '', enrollmentNumber: '', university: '', customUniversity: '',
      course: '', customCourse: '', companyName: '', tradingName: '', cnpj: ''
    },
    mode: "onBlur"
  });

  const profileType = form.watch('profileType');
  const { errors } = form.formState;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole && ['admin', 'producer', 'agent'].includes(urlRole)) {
      setRole(urlRole);
    }
  }, []);

  // ==========================================
  // 3. FUNÇÃO DE SUBMISSÃO (SÓ EXECUTA SE VÁLIDO)
  // ==========================================
  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const isoBirthDate = data.birthDate ? data.birthDate.split('/').reverse().join('-') : null;
      const finalUniversity = data.university === "Outra" ? data.customUniversity : data.university;
      const finalCourse = data.course === "Outro" ? data.customCourse : data.course;

      const userMetaData = data.profileType === 'PF' 
        ? {
            profile_type: 'PF',
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: `${data.firstName} ${data.lastName}`,
            cpf: data.cpf,
            role: role,
            birth_date: isoBirthDate,
            phone: data.phone,
            semester: data.semester,
            enrollment_number: data.enrollmentNumber,
            university: finalUniversity,
            course: finalCourse,
          }
        : {
            profile_type: 'PJ',
            company_name: data.companyName,
            trading_name: data.tradingName,
            full_name: data.tradingName || data.companyName,
            cnpj: data.cnpj,
            role: role, 
          };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: userMetaData,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        form.setError("email", { type: "manual", message: "Este e-mail já está cadastrado." });
        return;
      }

      setSuccessMsg("Quase lá! Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar a conta.");
      form.setValue("password", "");
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
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
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

            {/* E-MAIL */}
            <div className="space-y-2 relative">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                className={`py-6 rounded-xl transition-colors ${
                  errors.email ? "border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10" : ""
                }`}
              />
              {errors.email && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 transition-colors">
                    {String(errors.email.message)}
                  </p>
                  {String(errors.email.message).includes("cadastrado") && (
                    <Link href="/login" className="self-start mt-1">
                      <Button 
                        variant="link" 
                        type="button" 
                        className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        Deseja fazer login?
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100 fill-mode-both space-y-6">
              
              {/* TOGGLE PF/PJ */}
              <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl border border-gray-200 dark:border-slate-800 transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('profileType', 'PF');
                    form.clearErrors();
                  }}
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
                  onClick={() => {
                    form.setValue('profileType', 'PJ');
                    form.clearErrors();
                  }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    profileType === 'PJ' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Empresa (CNPJ)
                </button>
              </div>

              <PersonalDataFields form={form} />

            </div>

            {/* SENHA */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                  className={`py-6 rounded-xl pr-12 transition-colors ${
                    errors.password ? "border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10" : ""
                  }`}
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
              {errors.password && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1 animate-in fade-in slide-in-from-top-1">
                  {String(errors.password.message)}
                </p>
              )}
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