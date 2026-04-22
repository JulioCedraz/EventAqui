'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonalDataFields, { validateCPF, UNIVERSITIES_LIST, COURSES_LIST } from '../../components/PersonalDataFields';
import PrivacySettings from '../../components/PrivacySettings';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserCircle, Save, Mail, Sparkles, AlertCircle, X } from "lucide-react";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get('invite') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [initialData, setInitialData] = useState<any>(null);
  
  const [originalEmail, setOriginalEmail] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
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

    const securityChanges = newPassword !== '' || currentPassword !== '' || confirmNewPassword !== '';

    return fieldChanges || securityChanges;
  }, [email, firstName, lastName, cpf, birthDate, occupation, university, customUniversity, course, customCourse, area, customArea, specialty, newPassword, currentPassword, confirmNewPassword, initialData, hasCpfInitially]);

  const handleUpdateProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    if (isInvite && !newPassword) {
      toast.error('Por favor, defina uma senha para concluir o seu cadastro.');
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      toast.error('O CPF informado é inválido.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(isInvite ? 'Concluindo seu cadastro...' : 'Processando alterações...');

    try {
      if (!isInvite && newPassword && currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: originalEmail,
          password: currentPassword,
        });
        if (signInError) throw new Error('A senha atual está incorreta.');
      }

      const authUpdates: any = {};
      if (email !== originalEmail) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;
      if (firstName || lastName) {
        authUpdates.data = { full_name: `${firstName} ${lastName}`.trim(), name: `${firstName} ${lastName}`.trim() };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      if (userId) {
        const isoBirthDate = birthDate ? birthDate.split('/').reverse().join('-') : null;
        const profileUpdates: any = {
          email,
          first_name: firstName || null,
          last_name: lastName || null,
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

      toast.success(isInvite ? 'Cadastro concluído!' : 'Perfil atualizado!', { id: toastId });
      if (isInvite) {
        window.history.replaceState(null, '', '/profile');
        router.refresh();
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsEmailEditable(false);
      setOriginalEmail(email);
      setInitialData(prev => ({ ...prev, email, firstName, lastName, cpf, birthDate, occupation }));

    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar dados.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const renderRoleBadge = () => {
    if (!role || role === 'customer') return null;
    const badges = {
      admin: { label: 'Administrador', classes: 'bg-blue-100 text-blue-700' },
      producer: { label: 'Produtor', classes: 'bg-purple-100 text-purple-700' },
      agent: { label: 'Agente', classes: 'bg-emerald-100 text-emerald-700' },
    };
    const config = badges[role];
    return config ? <Badge className={`ml-3 align-middle text-sm px-3 py-0.5 border-transparent ${config.classes}`}>{config.label}</Badge> : null;
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <p className="text-gray-500 font-medium">Carregando...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {isInvite ? <Sparkles className="w-10 h-10 text-amber-500" /> : <UserCircle className="w-10 h-10 text-blue-600" />}
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center flex-wrap gap-2">
                {isInvite ? 'Concluir Cadastro' : 'Meu Perfil'}
                {!isInvite && renderRoleBadge()}
              </h1>
            </div>
          </div>
          {!isInvite && (
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-blue-600 font-bold self-start sm:self-auto">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          
          {/* CONTEINER 1: DADOS PESSOAIS */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 ml-1">Dados Pessoais</h2>
            <Card className="shadow-lg border-gray-100 rounded-3xl overflow-hidden">
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
            <h2 className="text-xl font-bold text-gray-800 ml-1">Segurança e Acesso</h2>
            <Card className="shadow-lg border-gray-100 rounded-3xl overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                
                {/* Linha 1: Email e Senha Atual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 font-semibold">
                        <Mail className="w-4 h-4 text-gray-400" /> E-mail
                      </Label>
                      {!isInvite && (
                        <Button 
                          type="button" variant="link" 
                          onClick={() => { setIsEmailEditable(!isEmailEditable); if(isEmailEditable) setEmail(originalEmail); }} 
                          className={`h-auto p-0 text-sm font-bold ${isEmailEditable ? 'text-red-500' : 'text-blue-600'}`}
                        >
                          {isEmailEditable ? 'Cancelar' : 'Alterar e-mail'}
                        </Button>
                      )}
                    </div>
                    <Input
                      id="email" type="email" required disabled={!isEmailEditable && !isInvite}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className={`h-12 rounded-xl border-gray-200 ${!isEmailEditable && !isInvite ? 'bg-gray-50' : 'border-blue-200'}`}
                    />
                  </div>

                  {!isInvite && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" title="Necessário para alterar e-mail ou senha">Senha Atual</Label>
                      <Input
                        id="currentPassword" type="password"
                        placeholder="Confirme sua identidade"
                        value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-12 rounded-xl border-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Linha 2: Novas Senhas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{isInvite ? 'Defina sua Senha' : 'Nova Senha'}</Label>
                    <Input
                      id="newPassword" type="password"
                      placeholder={isInvite ? "Mínimo 6 caracteres" : "Deixe vazio para não alterar"}
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword" type="password"
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="h-12 rounded-xl border-gray-200"
                    />
                  </div>
                </div>

                {isEmailEditable && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700">
                      Ao salvar um novo e-mail, você precisará confirmar a alteração através do link enviado para o novo endereço.
                    </p>
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
              className="w-full sm:w-auto h-12 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
            >
              <X className="w-4 h-4 mr-2" /> Descartar e Voltar
            </Button>

            <Button
              type="submit"
              disabled={isSaving || !hasChanges}
              className={`w-full sm:w-auto h-12 px-10 font-extrabold text-white rounded-xl shadow-md transition-all ${
                isInvite ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
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

        {!isInvite && <PrivacySettings email={email} />}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}