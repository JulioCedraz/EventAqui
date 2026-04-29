'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonalDataFields, { validateCPF, UNIVERSITIES_LIST, COURSES_LIST } from '../../components/PersonalDataFields';
import PrivacySettings from '../../components/PrivacySettings';
import SmartModal, { DialogConfig } from '../../components/SmartModal';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserCircle, Save, Mail, Sparkles, AlertCircle, X, LockKeyhole, KeyRound, Unlock, Eye, EyeOff } from "lucide-react";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get('invite') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [initialData, setInitialData] = useState<any>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  
  // Estados de Segurança
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(isInvite);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  // Estados de Visibilidade de Senha
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados de Email
  const [originalEmail, setOriginalEmail] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Estados de Dados Pessoais
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [hasCpfInitially, setHasCpfInitially] = useState(false);
  const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cpfMessage, setCpfMessage] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDateStatus, setBirthDateStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [birthDateMessage, setBirthDateMessage] = useState('');
  const [occupation, setOccupation] = useState<'profissional' | 'estudante'>('estudante');
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [customCourse, setCustomCourse] = useState("");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [role, setRole] = useState<'admin' | 'producer' | 'agent' | 'customer' | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      const userEmail = user.email || '';
      setEmail(userEmail);
      setOriginalEmail(userEmail);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao carregar o perfil:', profileError.message);
        toast.error('Erro ao sincronizar os dados do perfil.');
      }
      
      if (profileData) {
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        let formattedBirthDate = '';
        if (profileData.birth_date) {
          const parts = profileData.birth_date.split('-');
          formattedBirthDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
        }
        setBirthDate(formattedBirthDate);
        setRole(profileData.role || 'customer');
        setCpf(profileData.cpf || '');
        setHasCpfInitially(!!profileData.cpf);
        if (profileData.occupation === 'profissional' || profileData.occupation === 'estudante') {
          setOccupation(profileData.occupation);
        }
        
        if (profileData.university) {
          if (UNIVERSITIES_LIST.includes(profileData.university)) setUniversity(profileData.university);
          else { setUniversity("Outra"); setCustomUniversity(profileData.university); }
        }
        if (profileData.course) {
          if (COURSES_LIST.includes(profileData.course)) setCourse(profileData.course);
          else { setCourse("Outro"); setCustomCourse(profileData.course); }
        }
        if (profileData.area) {
          if (COURSES_LIST.includes(profileData.area)) setArea(profileData.area);
          else { setArea("Outra"); setCustomArea(profileData.area); }
        }
        setSpecialty(profileData.specialty || '');

        setInitialData({
          email: userEmail,
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          cpf: profileData.cpf || '',
          birthDate: formattedBirthDate,
          occupation: profileData.occupation || 'estudante',
          university: profileData.university || '',
          course: profileData.course || '',
          area: profileData.area || '',
          specialty: profileData.specialty || ''
        });
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [router]);

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    
    const fieldChanges = 
      email !== initialData.email ||
      firstName !== initialData.firstName ||
      lastName !== initialData.lastName ||
      (cpf !== initialData.cpf && !hasCpfInitially) ||
      birthDate !== initialData.birthDate ||
      occupation !== initialData.occupation ||
      specialty !== initialData.specialty ||
      (university === "Outra" ? customUniversity : university) !== initialData.university ||
      (course === "Outro" ? customCourse : course) !== initialData.course ||
      (area === "Outra" ? customArea : area) !== initialData.area;

    const securityChanges = newPassword !== '' || confirmNewPassword !== '';

    return (fieldChanges || securityChanges) && !emailError;
  }, [email, firstName, lastName, cpf, birthDate, occupation, university, customUniversity, course, customCourse, area, customArea, specialty, newPassword, confirmNewPassword, initialData, hasCpfInitially, emailError]);

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

  const handleEmailBlur = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de e-mail inválido.');
    } else {
      setEmailError('');
    }
  };

  const handleUpdateProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    if (isInvite && !newPassword) {
      toast.error('Por favor, defina uma senha para concluir o seu cadastro.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error('A nova senha e a confirmação não coincidem.');
        return;
      }
    }

    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      toast.error('O CPF informado é inválido.');
      return;
    }

    if (email !== originalEmail && !emailError) {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title: 'Confirmação em Duas Etapas',
        message: `Você solicitou a alteração para o e-mail: **${email}**.\n\nPara a sua segurança, será enviado um link de verificação para o e-mail antigo e outro para o novo. O seu e-mail não será alterado até que você clique em ambos os links.\n\nDeseja continuar?`,
        confirmText: 'Confirmar Envio',
        onConfirm: () => executeProfileUpdate(),
      });
      return;
    }

    await executeProfileUpdate();
  };

  const executeProfileUpdate = async () => {
    setIsSaving(true);
    setDialog(null);
    const toastId = toast.loading(isInvite ? 'Concluindo seu cadastro...' : 'Processando alterações...');

    try {
      const authUpdates: any = {};
      
      if (email !== originalEmail) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;
      if (firstName || lastName) {
        authUpdates.data = { full_name: `${firstName} ${lastName}`.trim() };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      if (userId) {
        const isoBirthDate = birthDate ? birthDate.split('/').reverse().join('-') : null;
        
        const profileUpdates: any = {
          first_name: firstName || null,
          last_name: lastName || null,
          cpf: cpf || null,
          occupation: occupation || null,
          birth_date: isoBirthDate,
          university: occupation === "estudante" ? (university === "Outra" ? customUniversity : university) : null,
          course: occupation === "estudante" ? (course === "Outro" ? customCourse : course) : null,
          area: occupation === "profissional" ? (area === "Outra" ? customArea : area) : null,
          specialty: occupation === "profissional" && area === "Medicina" ? specialty : null,
        };

        const { error: profileUpdateError } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
        if (profileUpdateError) throw profileUpdateError;
      }

      if (email !== originalEmail) {
        toast.success('Alterações salvas! Verifique as caixas de entrada dos seus e-mails para confirmar a alteração.', { id: toastId, duration: 6000 });
      } else {
        toast.success(isInvite ? 'Cadastro concluído!' : 'Perfil atualizado com sucesso!', { id: toastId });
      }

      if (isInvite) {
        router.push('/');
      }
      
      setNewPassword('');
      setConfirmNewPassword('');
      setInitialData(prev => ({ ...prev, firstName, lastName, cpf, birthDate, occupation }));

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
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 ml-1 transition-colors">Dados Pessoais</h2>
            <Card className="shadow-lg border-gray-100 dark:border-border dark:bg-card rounded-3xl overflow-hidden transition-colors">
              <CardContent className="p-6 sm:p-8">
                <PersonalDataFields
                  firstName={firstName} setFirstName={setFirstName}
                  lastName={lastName} setLastName={setLastName}
                  cpf={cpf} setCpf={setCpf}
                  hasCpfInitially={hasCpfInitially}
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
                        id="email" type="email" required
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        className={`h-12 rounded-xl bg-white dark:bg-slate-900 dark:text-gray-100 transition-colors ${emailError ? 'border-red-300 dark:border-red-500/50 focus-visible:ring-red-500 dark:focus-visible:ring-red-400' : 'border-blue-200 dark:border-slate-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400'}`}
                      />
                      {emailError && <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 transition-colors">{emailError}</p>}
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
                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-gray-100 pr-12 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300 transition-colors">Confirmar Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repita a nova senha"
                            value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className={`h-12 rounded-xl pr-12 bg-white dark:bg-slate-900 dark:text-gray-100 transition-colors ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-slate-700'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {confirmNewPassword && newPassword !== confirmNewPassword && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1 transition-colors">As senhas não coincidem.</p>
                        )}
                      </div>
                    </div>
                    
                    {email !== originalEmail && !emailError && (
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
              onClick={() => router.back()}
              className="w-full sm:w-auto h-12 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold rounded-xl transition-colors"
            >
              <X className="w-4 h-4 mr-2" /> Descartar e Voltar
            </Button>

            <Button
              type="submit"
              disabled={isSaving || !hasChanges}
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