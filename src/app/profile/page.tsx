'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

const validateCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
};

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [hasCpfInitially, setHasCpfInitially] = useState(false);
  const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cpfMessage, setCpfMessage] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [occupation, setOccupation] = useState<'profissional' | 'estudante'>('profissional');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      
      const userCpf = user.user_metadata?.cpf || '';
      setCpf(userCpf);
      setHasCpfInitially(!!userCpf);

      setOccupation(user.user_metadata?.occupation || 'profissional');
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleCpfBlur = () => {
    if (hasCpfInitially || !cpf) {
      setCpfStatus('idle');
      setCpfMessage('');
      return;
    }

    if (validateCPF(cpf)) {
      setCpfStatus('valid');
      setCpfMessage('CPF válido.');
    } else {
      setCpfStatus('invalid');
      setCpfMessage('CPF inválido. Verifique os números digitados.');
    }
  };

  const handleUpdateProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    if (!hasCpfInitially && cpf && !validateCPF(cpf)) {
      setCpfStatus('invalid');
      setCpfMessage('Corrija o CPF antes de salvar.');
      setSaving(false);
      return;
    }

    try {
      const updates: any = {
        data: {
          first_name: firstName,
          last_name: lastName,
          occupation: occupation,
        }
      };

      if (!hasCpfInitially && cpf) {
        updates.data.cpf = cpf;
      }

      if (email) updates.email = email;
      if (newPassword) updates.password = newPassword;

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      if (!hasCpfInitially && cpf) {
        setHasCpfInitially(true);
        setCpfStatus('idle');
        setCpfMessage('');
      }

      setNewPassword('');
      
      setMessage({ 
        text: 'Perfil atualizado com sucesso! (Se alterou o e-mail, verifique a sua caixa de entrada para confirmar).', 
        type: 'success' 
      });

    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
            
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-600 border border-red-100' 
                  : 'bg-green-50 text-green-600 border border-green-100'
              }`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <div className="relative">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatCPF(e.target.value));
                    if (cpfStatus !== 'idle') {
                      setCpfStatus('idle');
                      setCpfMessage('');
                    }
                  }}
                  onBlur={handleCpfBlur}
                  disabled={hasCpfInitially}
                  placeholder="000.000.000-00"
                  className={`block w-full px-4 py-2.5 border rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                    hasCpfInitially 
                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                      : cpfStatus === 'valid'
                        ? 'border-green-400 bg-green-50'
                        : cpfStatus === 'invalid'
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300'
                  }`}
                />
                {!hasCpfInitially && cpfStatus === 'valid' && (
                  <svg className="absolute right-3 top-3 w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {cpfMessage && !hasCpfInitially && (
                <p className={`mt-1.5 text-sm font-medium animate-in fade-in ${
                  cpfStatus === 'valid' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {cpfMessage}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="occupation"
                    value="estudante"
                    checked={occupation === 'estudante'}
                    onChange={(e) => setOccupation(e.target.value as any)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Estudante</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="occupation"
                    value="profissional"
                    checked={occupation === 'profissional'}
                    onChange={(e) => setOccupation(e.target.value as any)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Profissional</span>
                </label>
              </div>
            </div>

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

            <hr className="border-gray-100" />

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
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                Encerrar Sessão
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all active:scale-[0.98]"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </main>
  );
}