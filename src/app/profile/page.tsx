'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import PersonalDataFields, { validateCPF, UNIVERSITIES_LIST, COURSES_LIST } from '../../components/PersonalDataFields';
import PrivacySettings from '../../components/PrivacySettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserCircle, LogOut, Save, Mail, Lock } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

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
        .select('first_name, last_name, cpf, occupation, birth_date, university, course, area, specialty')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao carregar o perfil do banco de dados:', profileError.message);
      }

      if (profileData) {
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setBirthDate(profileData.birth_date || '');
        
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
    
    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      setCpfMessage('Corrija o CPF antes de salvar.');
      toast.error('O CPF informado é inválido.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Salvando as suas alterações...');

    try {
      const authUpdates: { email?: string; password?: string } = {};
      if (email !== originalEmail) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      if (userId) {
        const finalUniversity = university === "Outra" ? customUniversity : university;
        const finalCourse = course === "Outro" ? customCourse : course;
        const finalArea = area === "Outra" ? customArea : area;

        const profileUpdates: any = {
          first_name: firstName,
          last_name: lastName,
          occupation: occupation,
          birth_date: birthDate,
        };

        if (!hasCpfInitially && cpf) {
          profileUpdates.cpf = cpf;
        }
        if (occupation === "estudante") {
          profileUpdates.university = finalUniversity;
          profileUpdates.course = finalCourse;
          profileUpdates.area = null;
          profileUpdates.specialty = null;
        } else {
          profileUpdates.area = finalArea;
          profileUpdates.specialty = finalArea === "Medicina" ? specialty : null;
          profileUpdates.university = null;
          profileUpdates.course = null;
        }

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (profileUpdateError) throw profileUpdateError;
      }

      if (!hasCpfInitially && cpf) {
        setHasCpfInitially(true);
        setCpfStatus('idle');
        setCpfMessage('');
      }
      setNewPassword('');
      if (email !== originalEmail) setOriginalEmail(email);

      toast.success('Perfil atualizado com sucesso!', { 
        id: toastId,
        description: email !== originalEmail ? 'Como você alterou o e-mail, verifique a sua caixa de entrada para confirmar.' : undefined
      });

    } catch (err: any) {
      toast.error(err.message || 'Ocorreu um erro ao atualizar o perfil.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
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

        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCircle className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h1>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-blue-600 self-start sm:self-auto font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>

        {/* FORMULÁRIO PRINCIPAL */}
        <Card className="shadow-lg border-gray-100 rounded-3xl overflow-hidden">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground ml-1">
                    Se alterar o seu e-mail, será necessário confirmar o novo endereço.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    Nova Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Deixe em branco para não alterar"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="h-12 rounded-xl"
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
                  Sair da Conta
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto h-12 px-8 font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 rounded-xl"
                >
                  {isSaving ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando</>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <PrivacySettings email={email} />

      </div>
    </main>
  );
}