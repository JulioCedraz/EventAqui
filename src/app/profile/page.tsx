'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import PersonalDataFields, { 
  basePersonalDataSchema, 
  refinePersonalData, 
  UNIVERSITIES_LIST, 
  COURSES_LIST 
} from '../../components/PersonalDataFields';
import PrivacySettings from '../../components/PrivacySettings';
import SmartModal, { DialogConfig } from '../../components/SmartModal';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, ArrowLeft, UserCircle, Save, Mail, 
  Sparkles, AlertCircle, X, LockKeyhole, KeyRound, 
  Unlock, Eye, EyeOff 
} from "lucide-react";

// ==========================================
// 1. EXTENSÃO DO SCHEMA BASE PARA O PERFIL
// ==========================================
const profileSchema = basePersonalDataSchema.extend({
  email: z.string().email("Formato de e-mail inválido"),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional()
}).superRefine((data, ctx) => {
  // Validações bases (CPF, Telefone, etc)
  refinePersonalData(data, ctx);
  
  // Validações de alteração de senha
  if (data.newPassword && data.newPassword.length < 6) {
    ctx.addIssue({ path: ['newPassword'], message: "A nova senha deve ter no mínimo 6 caracteres", code: z.ZodIssueCode.custom });
  }
  if (data.newPassword !== data.confirmNewPassword) {
    ctx.addIssue({ path: ['confirmNewPassword'], message: "As senhas não coincidem", code: z.ZodIssueCode.custom });
  }
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get('invite') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  
  // Estados de Segurança 
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(isInvite);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  // Estados Visuais e Auxiliares
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [hasCpfInitially, setHasCpfInitially] = useState(false);
  const [role, setRole] = useState<'admin' | 'producer' | 'agent' | 'customer' | null>(null);

  // ==========================================
  // 2. CONFIGURAÇÃO DO REACT HOOK FORM
  // ==========================================
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      email: '', newPassword: '', confirmNewPassword: '',
      firstName: '', lastName: '', cpf: '', birthDate: '', phone: '',
      semester: '', enrollmentNumber: '', university: '', customUniversity: '',
      course: '', customCourse: ''
    }
  });

  const { errors, isDirty } = form.formState;
  const currentEmailValue = form.watch("email");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }
      
      setUserId(user.id);
      const userEmail = user.email || '';
      setOriginalEmail(userEmail);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        toast.error('Erro ao sincronizar os dados do perfil.');
      }
        
      if (profileData) {
        setRole(profileData.role || 'customer');
        setHasCpfInitially(!!profileData.cpf);

        let formattedBirthDate = '';
        if (profileData.birth_date) {
          const parts = profileData.birth_date.split('-');
          formattedBirthDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
        }

        let univValue = profileData.university || '';
        let customUnivValue = '';
        if (univValue && !UNIVERSITIES_LIST.includes(univValue)) {
          customUnivValue = univValue;
          univValue = 'Outra';
        }

        let courseValue = profileData.course || '';
        let customCourseValue = '';
        if (courseValue && !COURSES_LIST.includes(courseValue)) {
          customCourseValue = courseValue;
          courseValue = 'Outro';
        }

        form.reset({
          email: userEmail,
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          cpf: profileData.cpf || '',
          birthDate: formattedBirthDate,
          phone: profileData.phone || '',
          semester: profileData.semester || '',
          enrollmentNumber: profileData.enrollment_number || '',
          university: univValue,
          customUniversity: customUnivValue,
          course: courseValue,
          customCourse: customCourseValue,
          newPassword: '',
          confirmNewPassword: ''
        });
      }
      setIsLoading(false);
    };

    loadProfile();
  }, [router, form]);

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      toast.error('Informe a senha atual para prosseguir.');
      return;
    }
    setIsVerifyingPassword(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: originalEmail,
      password: currentPassword,
    });
    setIsVerifyingPassword(false);

    if (error) {
      toast.error('Senha atual incorreta.');
    } else {
      setIsSecurityUnlocked(true);
      toast.success('Identidade confirmada. Edição de segurança liberada.');
    }
  };

  // ==========================================
  // 3. EXECUÇÃO DA ATUALIZAÇÃO (SÓ RODA SE VÁLIDO)
  // ==========================================
  const handleUpdateProfile = form.handleSubmit((data: ProfileFormValues) => {
    if (isInvite && !data.newPassword) {
      toast.error('Por favor, defina uma senha para concluir o seu cadastro.');
      return;
    }

    if (data.email !== originalEmail) {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title: 'Confirmação em Duas Etapas',
        message: `Você solicitou a alteração para o e-mail: **${data.email}**.\n\nPara a sua segurança, será enviado um link de verificação para o e-mail antigo e outro para o novo. O seu e-mail não será alterado até que você clique em ambos os links.\n\nDeseja continuar?`,
        confirmText: 'Confirmar Envio',
        onConfirm: () => executeProfileUpdate(data),
      });
      return;
    }

    executeProfileUpdate(data);
  });

  const executeProfileUpdate = async (data: ProfileFormValues) => {
    setIsSaving(true);
    setDialog(null);
    const toastId = toast.loading(isInvite ? 'Concluindo seu cadastro...' : 'Processando alterações...');

    try {
      const authUpdates: any = {};
      
      if (data.email !== originalEmail) authUpdates.email = data.email;
      if (data.newPassword) authUpdates.password = data.newPassword;
      
      if (data.firstName || data.lastName) {
        authUpdates.data = { full_name: `${data.firstName} ${data.lastName}`.trim() };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      if (userId) {
        const isoBirthDate = data.birthDate ? data.birthDate.split('/').reverse().join('-') : null;
        const finalUniversity = data.university === "Outra" ? data.customUniversity : data.university;
        const finalCourse = data.course === "Outro" ? data.customCourse : data.course;
        
        const profileUpdates: any = {
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          cpf: data.cpf || null,
          birth_date: isoBirthDate,
          phone: data.phone || null,
          semester: data.semester || null,
          enrollment_number: data.enrollmentNumber || null,
          university: finalUniversity || null,
          course: finalCourse || null,
        };

        const { error: profileUpdateError } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
        if (profileUpdateError) throw profileUpdateError;
      }

      if (data.email !== originalEmail) {
        toast.success('Alterações salvas! Verifique as caixas de entrada dos seus e-mails para confirmar a alteração.', { id: toastId, duration: 6000 });
      } else {
        toast.success(isInvite ? 'Cadastro concluído!' : 'Perfil atualizado com sucesso!', { id: toastId });
      }

      if (isInvite) {
        router.push('/');
      }
      
      // Reseta o form com os novos dados para atualizar o estado isDirty para false
      form.reset({ ...data, newPassword: '', confirmNewPassword: '' });
      if (data.email !== originalEmail) setOriginalEmail(data.email);

    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const renderRoleBadge = () => {
    if (!role || role === 'customer') return null;
    const badges = {
      admin: { label: 'Administrador', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
      producer: { label: 'Produtor', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
      agent: { label: 'Agente', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    };
    const config = badges[role];
    return config ? <Badge className={`ml-3 align-middle text-sm px-3 py-0.5 border-transparent transition-colors ${config.classes}`}>{config.label}</Badge> : null;
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col items-center justify-center space-y-4 transition-colors">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Carregando...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <SmartModal dialog={dialog} onClose={() => setDialog(null)} isProcessing={isSaving} />

      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {isInvite ? <Sparkles className="w-10 h-10 text-amber-500 dark:text-amber-400 transition-colors" /> : <UserCircle className="w-10 h-10 text-blue-600 dark:text-blue-500 transition-colors" />}
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center flex-wrap gap-2 transition-colors">
                {isInvite ? 'Concluir Cadastro' : 'Meu Perfil'}
                {!isInvite && renderRoleBadge()}
              </h1>
            </div>
          </div>
          {!isInvite && (
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold self-start sm:self-auto transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          
          {/* CONTEINER 1: DADOS PESSOAIS */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 ml-1 transition-colors">Meus Dados</h2>
            <Card className="shadow-lg border-gray-100 dark:border-border dark:bg-card rounded-3xl overflow-hidden transition-colors">
              <CardContent className="p-6 sm:p-8 space-y-6">
                
                <PersonalDataFields form={form} hasCpfInitially={hasCpfInitially} />
              </CardContent>
            </Card>
          </div>

          {/* CONTEINER 2: SEGURANÇA */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 ml-1 transition-colors">Segurança e Acesso</h2>
            <Card className="shadow-lg border-gray-100 dark:border-border dark:bg-card rounded-3xl overflow-hidden min-h-45 transition-colors">
              <CardContent className="p-6 sm:p-8">
                
                {!isSecurityUnlocked ? (
                  // CREDENCIAIS SEGURAS
                  <div key="locked" className="flex flex-col items-center justify-center space-y-5 animate-in fade-in zoom-in-95 duration-500 py-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center transition-colors">
                      <LockKeyhole className="w-8 h-8 text-blue-500 dark:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg transition-colors">Credenciais de acesso</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto transition-colors">
                        Para visualizar ou alterar seu e-mail e palavra-passe, precisamos confirmar sua identidade.
                      </p>
                    </div>
                    
                    <div className="w-full max-w-sm space-y-4">
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Digite sua senha atual"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-12 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-gray-100 text-center text-lg tracking-wide pr-12 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleVerifyCurrentPassword}
                        disabled={!currentPassword || isVerifyingPassword}
                        className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
                      >
                        {isVerifyingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Unlock className="w-4 h-4 mr-2"/> Desbloquear</>}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // CREDENCIAIS ABERTAS AO USUÁRIO
                  <div key="unlocked" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-slate-800 transition-colors">
                      <Unlock className="w-5 h-5 text-emerald-500 dark:text-emerald-400 transition-colors" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm transition-colors">Suas credenciais</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold transition-colors">
                        <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" /> E-mail
                      </Label>
                      <Input
                        id="email" type="email"
                        {...form.register("email")}
                        className={`h-12 rounded-xl bg-white dark:bg-slate-900 dark:text-gray-100 transition-colors ${errors.email ? 'border-red-300 dark:border-red-500/50 focus-visible:ring-red-500 dark:focus-visible:ring-red-400' : 'border-blue-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400'}`}
                      />
                      {errors.email && <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 transition-colors">{String(errors.email.message)}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors">
                           <KeyRound className="w-4 h-4 text-gray-400 dark:text-gray-500"/> 
                           {isInvite ? 'Defina sua Senha' : 'Nova Senha'}
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword" type={showNewPassword ? "text" : "password"}
                            placeholder={isInvite ? "Mínimo 6 caracteres" : "Mínimo de 6 caracteres"}
                            {...form.register("newPassword")}
                            className={`h-12 rounded-xl pr-12 bg-white dark:bg-slate-900 dark:text-gray-100 transition-colors ${errors.newPassword ? 'border-red-300 dark:border-red-500/50 focus-visible:ring-red-500' : 'border-gray-200 dark:border-slate-700'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.newPassword && <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 transition-colors">{String(errors.newPassword.message)}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300 transition-colors">Confirmar Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repita a nova senha"
                            {...form.register("confirmNewPassword")}
                            className={`h-12 rounded-xl pr-12 bg-white dark:bg-slate-900 dark:text-gray-100 transition-colors ${errors.confirmNewPassword ? 'border-red-300 dark:border-red-500/50 focus-visible:ring-red-500' : 'border-gray-200 dark:border-slate-700'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.confirmNewPassword && <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 transition-colors">{String(errors.confirmNewPassword.message)}</p>}
                      </div>
                    </div>
                    
                    {currentEmailValue !== originalEmail && !errors.email && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl flex gap-3 animate-in fade-in transition-colors">
                        <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 transition-colors" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 transition-colors">
                          Ao salvar as alterações, a mudança de e-mail exigirá confirmação de segurança dupla na sua caixa de entrada.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* BOTÕES DE RODAPÉ */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button
              type="button" variant="ghost"
              onClick={() => {
                form.reset();
                if (currentEmailValue !== originalEmail) form.setValue('email', originalEmail);
              }}
              disabled={!isDirty || isSaving}
              className="w-full sm:w-auto h-12 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 mr-2" /> Descartar
            </Button>

            <Button
              type="submit"
              disabled={isSaving || !isDirty}
              className={`w-full sm:w-auto h-12 px-10 font-extrabold text-white rounded-xl shadow-md transition-all ${
                isInvite ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
              } disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>
              )}
            </Button>
          </div>
        </form>

        {!isInvite && <PrivacySettings email={originalEmail} />}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center transition-colors"><Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}