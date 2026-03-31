'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import PersonalDataFields, { validateCPF, UNIVERSITIES_LIST, COURSES_LIST } from '../../components/PersonalDataFields';

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

  // LGPD
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteToken, setDeleteToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isSendingToken, setIsSendingToken] = useState(false);
  const [isTokenSent, setIsTokenSent] = useState(false);

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

  const handleSendDeleteToken = async () => {
    setIsSendingToken(true);
    setModalError(''); 
    
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw new Error('Erro ao enviar o código de segurança. Tente novamente.');
      setIsTokenSent(true);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSendingToken(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteToken || deleteToken.length < 6) {
      setModalError('Por favor, digite o código de 6 dígitos válido.');
      return;
    }

    setIsDeleting(true);
    setModalError('');

    try {
      const { error: verifyError } = await supabase.auth.updateUser({
        nonce: deleteToken,
        data: { lgpd_deletion_requested: true } 
      });

      if (verifyError) throw new Error('Código inválido ou expirado. Verifique seu e-mail e tente novamente.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro interno ao excluir a conta.');

      await supabase.auth.signOut();
      router.push('/login');

    } catch (err: any) {
      setModalError(err.message);
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setIsTokenSent(false);
    setDeleteToken('');
    setModalError('');
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

          {/* LGPD */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
              className="flex items-center justify-between w-full text-left focus:outline-none group"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Privacidade e Exclusão de Conta</h3>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDangerZoneExpanded ? 'rotate-180' : ''}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDangerZoneExpanded && (
              <div className="mt-5 p-5 bg-red-50 border border-red-100 rounded-xl text-justify animate-in fade-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-red-800 mb-3">Em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD), você decide o que fazer com as suas informações. <br /> <br /> O que acontece ao excluir sua conta?</h4>
                <ul className="text-sm text-red-700 space-y-2 mb-5 list-disc list-inside">
                  <li><strong>Dados apagados:</strong> Seu nome, e-mail, CPF e todos os seus demais dados serão removidos permanentemente desta plataforma.</li>
                  <li><strong>Acesso revogado:</strong> Você perderá o acesso à plataforma e a todos os ingressos ativos comprados com esta conta.</li>
                  <li><strong>Anonimato:</strong> O seu histórico financeiro será mantido exclusivamente para fins de auditoria, mas sem qualquer vínculo com a sua identidade pessoal.</li>
                </ul>
                <p className="text-sm font-medium text-red-800 mb-5">
                  Atenção: Esta ação é <span className="underline decoration-red-400 font-bold">irreversível</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg transition-colors shadow-sm"
                >
                  Desejo excluir minha conta
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            
            {modalError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4 font-medium animate-in fade-in">
                {modalError}
              </div>
            )}

            {!isTokenSent ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Excluir Conta?</h3>
                </div>
                
                <p className="text-sm text-justify text-gray-600 mb-4">
                  Todos os seus dados pessoais, históricos de acessos e ingressos ativos serão apagados definitivamente. Se você mudar de ideia futuramente, precisará realizar um novo cadastro.
                </p>

                <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl mb-6">
                  <p className="text-xs text-yellow-800 font-medium text-center">
                    Para garantir sua segurança, precisamos enviar um código de confirmação para o seu e-mail antes de prosseguir.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button onClick={closeModal} disabled={isSendingToken} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleSendDeleteToken} disabled={isSendingToken} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSendingToken ? 'Enviando...' : 'Enviar Código'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Código de Segurança</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Digite o código de 6 dígitos que enviamos para o seu e-mail (<b>{email}</b>) para confirmar a exclusão.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={deleteToken}
                  onChange={(e) => setDeleteToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 mb-6"
                />
                
                <div className="flex justify-end gap-3">
                  <button onClick={closeModal} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleDeleteAccount} disabled={isDeleting || deleteToken.length < 6} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </main>
  );
}