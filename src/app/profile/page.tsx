'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import PersonalDataFields, { validateCPF, UNIVERSITIES_LIST, COURSES_LIST } from '../../components/PersonalDataFields';
import PrivacySettings from '../../components/PrivacySettings';

export default function ProfilePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ text: '', type: '' });
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
    setIsSaving(true);
    setAlertMessage({ text: '', type: '' });

    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      setCpfMessage('Corrija o CPF antes de salvar.');
      setIsSaving(false);
      return;
    }

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

      setAlertMessage({
        text: 'Perfil atualizado com sucesso! (Se alterou o e-mail, verifique a sua caixa de entrada para confirmar).',
        type: 'success'
      });

    } catch (err: any) {
      setAlertMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h1>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            &larr; Voltar
          </button>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl border border-gray-100">
          <form onSubmit={handleUpdateProfile} className="space-y-6">

            {alertMessage.text && (
              <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in ${
                alertMessage.type === 'error'
                  ? 'bg-red-50 text-red-600 border border-red-100'
                  : 'bg-green-50 text-green-600 border border-green-100'
              }`}>
                {alertMessage.text}
              </div>
            )}

            <PersonalDataFields
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              cpf={cpf} setCpf={setCpf}
              hasCpfInitially={hasCpfInitially}
              cpfStatus={cpfStatus} setCpfStatus={setCpfStatus}
              cpfMessage={cpfMessage} setCpfMessage={setCpfMessage}
              birthDate={birthDate} setBirthDate={setBirthDate}
              occupation={occupation} setOccupation={setOccupation}
              course={course} setCourse={setCourse}
              customCourse={customCourse} setCustomCourse={setCustomCourse}
              university={university} setUniversity={setUniversity}
              customUniversity={customUniversity} setCustomUniversity={setCustomUniversity}
              area={area} setArea={setArea}
              customArea={customArea} setCustomArea={setCustomArea}
              specialty={specialty} setSpecialty={setSpecialty}
            />

            <hr className="border-gray-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se alterar o seu e-mail, será necessário confirmar o novo endereço.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (Opcional)</label>
              <input
                type="password"
                placeholder="Deixe em branco para não alterar"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="text-sm font-medium text-gray-600 hover:text-red-900 transition-colors"
              >
                Sair
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all active:scale-[0.98]"
              >
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>

          {/* O COMPONENTE LGPD AQUI */}
          <PrivacySettings email={email} />

        </div>
      </div>
    </main>
  );
}