'use client';

import { useState, useEffect, Suspense } from 'react';
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
import { Loader2, ArrowLeft, UserCircle, LogOut, Save, Mail, Lock, Sparkles } from "lucide-react";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get('invite') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
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
      setEmail(user.email || '');
      setOriginalEmail(user.email || '');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, cpf, occupation, birth_date, university, course, area, specialty, role')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao carregar o perfil do banco de dados:', profileError.message);
      }

      if (profileData) {
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setBirthDate(profileData.birth_date || '');
        setRole(profileData.role || 'customer');
        
        const userCpf = profileData.cpf || '';
        setCpf(userCpf);
        setHasCpfInitially(!!userCpf);

        if (profileData.occupation === 'profissional' || profileData.occupation === 'estudante') {
          setOccupation(profileData.occupation);
        }

        const dbUniversity = profileData.university || '';
        if (dbUniversity) {
          if (UNIVERSITIES_LIST.includes(dbUniversity)) {
            setUniversity(dbUniversity);
          } else {
            setUniversity("Outra");
            setCustomUniversity(dbUniversity);
          }
        }

        const dbCourse = profileData.course || '';
        if (dbCourse) {
          if (COURSES_LIST.includes(dbCourse)) {
            setCourse(dbCourse);
          } else {
            setCourse("Outro");
            setCustomCourse(dbCourse);
          }
        }

        const dbArea = profileData.area || '';
        if (dbArea) {
          if (COURSES_LIST.includes(dbArea)) {
            setArea(dbArea);
          } else {
            setArea("Outra");
            setCustomArea(dbArea);
          }
        }
        setSpecialty(profileData.specialty || '');
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    if (isInvite && !newPassword) {
      toast.error('Por favor, defina uma senha para concluir o seu cadastro.');
      return;
    }

    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      setCpfMessage('Corrija o CPF antes de salvar.');
      toast.error('O CPF informado é inválido.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(isInvite ? 'Concluindo seu cadastro...' : 'Salvando as suas alterações...');

    try {
      const authUpdates: { email?: string; password?: string; data?: any } = {};
      if (email !== originalEmail) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      if (firstName || lastName) {
        authUpdates.data = {
          full_name: `${firstName} ${lastName}`.trim(),
          name: `${firstName} ${lastName}`.trim()
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      if (userId) {
        const finalUniversity = university === "Outra" ? customUniversity : university;
        const finalCourse = course === "Outro" ? customCourse : course;
        const finalArea = area === "Outra" ? customArea : area;
        const { data: { user } } = await supabase.auth.getUser();

        const profileUpdates: any = {
          id: userId,
          first_name: firstName || null,
          last_name: lastName || null,
          occupation: occupation || null,
          birth_date: birthDate || null,
        };

        if (user?.user_metadata?.role) {
          profileUpdates.role = user.user_metadata.role;
        }
        if (user?.user_metadata?.producer_id) {
          profileUpdates.producer_id = user.user_metadata.producer_id;
        }

        if (!hasCpfInitially && cpf) {
          profileUpdates.cpf = cpf;
        }
        
        if (occupation === "estudante") {
          profileUpdates.university = finalUniversity || null;
          profileUpdates.course = finalCourse || null;
          profileUpdates.area = null;
          profileUpdates.specialty = null;
        } else {
          profileUpdates.area = finalArea || null;
          profileUpdates.specialty = finalArea === "Medicina" ? specialty : null;
          profileUpdates.university = null;
          profileUpdates.course = null;
        }

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .upsert(profileUpdates, { onConflict: 'id' });

        if (profileUpdateError) throw profileUpdateError;
      }

      if (!hasCpfInitially && cpf) {
        setHasCpfInitially(true);
        setCpfStatus('idle');
        setCpfMessage('');
      }
      
      setNewPassword('');
      if (email !== originalEmail) setOriginalEmail(email);

      if (isInvite) {
        window.history.replaceState(null, '', '/profile');
        toast.success('Cadastro concluído com sucesso! Bem-vindo(a) à plataforma.', { id: toastId });
      } else {
        toast.success('Perfil atualizado com sucesso!', { 
          id: toastId,
          description: email !== originalEmail ? 'Como você alterou o e-mail, verifique a sua caixa de entrada para confirmar.' : undefined
        });
      }

    } catch (err: any) {
      toast.error(err.message || 'Ocorreu um erro ao salvar os dados.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const renderRoleBadge = () => {
    if (!role || role === 'customer') return null;

    const badgesConfig = {
      admin: { label: 'Administrador', classes: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-transparent' },
      producer: { label: 'Produtor', classes: 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-transparent' },
      agent: { label: 'Agente de Portaria', classes: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent' },
    };

    const config = badgesConfig[role];
    if (!config) return null;

    return (
      <Badge className={`ml-3 align-middle text-sm px-3 py-0.5 ${config.classes}`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* CABEÇALHO DINÂMICO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {isInvite ? (
                <Sparkles className="w-10 h-10 text-amber-500" />
              ) : (
                <UserCircle className="w-10 h-10 text-blue-600" />
              )}
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center flex-wrap gap-2">
                {isInvite ? 'Concluir Cadastro' : 'Meu Perfil'}
                {!isInvite && renderRoleBadge()}
              </h1>
            </div>
            {isInvite && (
              <p className="text-gray-600 font-medium ml-13">
                Bem-vindo(a)! Defina uma senha e preencha seus dados para liberar seu acesso.
              </p>
            )}
          </div>
          
          {!isInvite && (
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-blue-600 self-start sm:self-auto font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          )}
        </div>

        {/* FORMULÁRIO PRINCIPAL */}
        <Card className={`shadow-lg border-gray-100 rounded-3xl overflow-hidden ${isInvite ? 'ring-2 ring-amber-500/20' : ''}`}>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleUpdateProfile} className="space-y-8">

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

              <div className="border-t border-gray-100 pt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    disabled={isInvite}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  {!isInvite && (
                    <p className="text-xs text-muted-foreground ml-1">
                      Se alterar o seu e-mail, será necessário confirmar o novo endereço.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${isInvite ? 'text-amber-500' : 'text-gray-400'}`} />
                    {isInvite ? 'Defina sua Senha' : 'Nova Senha'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required={isInvite}
                    placeholder={isInvite ? "Mínimo de 6 caracteres" : "Deixe em branco para não alterar"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className={`h-12 rounded-xl ${isInvite ? 'border-amber-200 focus-visible:ring-amber-500' : ''}`}
                  />
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/login');
                  }}
                  className="w-full sm:w-auto h-12 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isInvite ? 'Cancelar e Sair' : 'Sair da Conta'}
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full sm:w-auto h-12 px-8 font-bold text-white rounded-xl shadow-md ${
                    isInvite 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {isSaving ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isInvite ? 'Concluindo' : 'Salvando'}</>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> {isInvite ? 'Concluir Cadastro' : 'Salvar Alterações'}</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {!isInvite && <PrivacySettings email={email} />}

      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}