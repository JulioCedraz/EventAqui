'use client';

import { supabase } from '../lib/supabase';

export const UNIVERSITIES_LIST = [
  "UFBA", "UFRB", "UFOB", "UNEB", "UEFS", "UESC", "UESB", 
  "EBMSP (Bahiana)", "UCSal", "UNIVASF", "UNIFACS", 
  "UnidomPedro", "Zarns", "Estácio"
];

export const COURSES_LIST = [
  "Medicina", "Farmácia", "Nutrição", "Enfermagem", "Fisioterapia", 
  "Odontologia", "Psicologia", "Direito", "Engenharia", "Tecnologia (TI)", 
  "Administração", "Arquitetura e Urbanismo", "Medicina Veterinária"
];

export const SPECIALTIES_LIST = [
  "Anestesiologia", "Cardiologia", "Cirurgia Geral", "Clínica Médica", 
  "Dermatologia", "Gastroenterologia", "Ginecologia e Obstetrícia", 
  "Medicina de Família", "Nefrologia", "Oftalmologia", 
  "Ortopedia e Traumatologia", "Patologia", "Pediatria", 
  "Psiquiatria", "Radiologia", "Geral / Outra", "Sem especialidade"
];

export const validateCPF = (cpf: string) => {
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

export const validateBirthDate = (dateStr: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;

  const parts = dateStr.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (year < 1900 || year > new Date().getFullYear() || month === 0 || month > 12) {
    return false;
  }

  const maxDays = new Date(year, month, 0).getDate();
  if (day === 0 || day > maxDays) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 10);
  const inputDate = new Date(year, month - 1, day);
  if (inputDate > minDate) {
    return false;
  }

  return true;
};

export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatBirthDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{4})\d+?$/, '$1');
};

interface PersonalDataFieldsProps {
  firstName: string; setFirstName: (val: string) => void;
  lastName: string; setLastName: (val: string) => void;
  cpf: string; setCpf: (val: string) => void;
  hasCpfInitially?: boolean;
  cpfStatus: 'idle' | 'valid' | 'invalid'; setCpfStatus: (val: 'idle' | 'valid' | 'invalid') => void;
  cpfMessage: string; setCpfMessage: (val: string) => void;
  onCpfExists?: (maskedEmail: string) => void;
  birthDate: string; setBirthDate: (val: string) => void;
  birthDateStatus: 'idle' | 'valid' | 'invalid'; setBirthDateStatus: (val: 'idle' | 'valid' | 'invalid') => void;
  birthDateMessage: string; setBirthDateMessage: (val: string) => void;
  occupation: 'estudante' | 'profissional'; setOccupation: (val: 'estudante' | 'profissional') => void;
  course: string; setCourse: (val: string) => void;
  customCourse: string; setCustomCourse: (val: string) => void;
  university: string; setUniversity: (val: string) => void;
  customUniversity: string; setCustomUniversity: (val: string) => void;
  area: string; setArea: (val: string) => void;
  customArea: string; setCustomArea: (val: string) => void;
  specialty: string; setSpecialty: (val: string) => void;
}

export default function PersonalDataFields({
  firstName, setFirstName, lastName, setLastName,
  cpf, setCpf, hasCpfInitially = false, cpfStatus, setCpfStatus, cpfMessage, setCpfMessage, onCpfExists,
  birthDate, setBirthDate, birthDateStatus, setBirthDateStatus, birthDateMessage, setBirthDateMessage,
  occupation, setOccupation,
  course, setCourse, customCourse, setCustomCourse,
  university, setUniversity, customUniversity, setCustomUniversity,
  area, setArea, customArea, setCustomArea,
  specialty, setSpecialty
}: PersonalDataFieldsProps) {

  const handleCpfBlur = async () => {
    if (hasCpfInitially || !cpf) {
      setCpfStatus('idle');
      setCpfMessage('');
      return;
    }
    
    if (validateCPF(cpf)) {
      setCpfStatus('valid');
      setCpfMessage('Verificando...');

      try {
        const { data: maskedEmail, error } = await supabase.rpc('check_cpf_exists', { lookup_cpf: cpf });
        
        if (error) throw error;

        if (maskedEmail) {
          setCpfStatus('invalid');
          setCpfMessage('Este CPF já está em uso.');
          if (onCpfExists) onCpfExists(maskedEmail);
        } else {
          setCpfStatus('valid');
          setCpfMessage('CPF válido e disponível.');
        }
      } catch (err) {
        console.error("Erro ao verificar CPF:", err);
        setCpfStatus('valid');
        setCpfMessage('CPF válido.');
      }
    } else {
      setCpfStatus('invalid');
      setCpfMessage('CPF inválido. Verifique os números digitados.');
    }
  };

  const handleBirthDateBlur = () => {
    if (!birthDate || birthDate.length < 10) {
      setBirthDateStatus('idle');
      setBirthDateMessage('');
      return;
    }
    if (validateBirthDate(birthDate)) {
      setBirthDateStatus('valid');
      setBirthDateMessage('');
    } else {
      setBirthDateStatus('invalid');
      setBirthDateMessage('Data inválida.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* NOME E SOBRENOME */}
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

      {/* CPF E DATA DE NASCIMENTO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <div className="relative">
            <input
              type="text"
              required={!hasCpfInitially}
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
            <p className={`mt-1.5 text-sm font-medium animate-in fade-in ${cpfStatus === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
              {cpfMessage}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
          <div className="relative">
            <input
              type="text"
              required
              value={birthDate}
              onChange={(e) => {
                setBirthDate(formatBirthDate(e.target.value));
                if (birthDateStatus !== 'idle') {
                  setBirthDateStatus('idle');
                  setBirthDateMessage('');
                }
              }}
              onBlur={handleBirthDateBlur}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              className={`block w-full px-4 py-2.5 border rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                birthDateStatus === 'valid'
                  ? 'border-green-400 bg-green-50'
                  : birthDateStatus === 'invalid'
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300'
              }`}
            />
            {birthDateStatus === 'valid' && (
              <svg className="absolute right-3 top-3 w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {birthDateMessage && (
            <p className={`mt-1.5 text-sm font-medium animate-in fade-in ${birthDateStatus === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
              {birthDateMessage}
            </p>
          )}
        </div>
      </div>

      {/* OCUPAÇÃO */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="occupation"
              value="estudante"
              checked={occupation === 'estudante'}
              onChange={() => setOccupation('estudante')}
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
              onChange={() => setOccupation('profissional')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Profissional</span>
          </label>
        </div>
      </div>

      {/* ESTUDANTE */}
      {occupation === "estudante" && (
        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
            <select
              required={occupation === "estudante"}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white"
            >
              <option value="" disabled>Selecione seu curso</option>
              {COURSES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Outro">Outro</option>
            </select>
          </div>

          {course === "Outro" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qual curso?</label>
              <input
                type="text"
                required={occupation === "estudante" && course === "Outro"}
                value={customCourse}
                onChange={(e) => setCustomCourse(e.target.value)}
                placeholder="Digite o nome do seu curso"
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instituição de Ensino</label>
            <select
              required={occupation === "estudante"}
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white"
            >
              <option value="" disabled>Selecione sua universidade</option>
              {UNIVERSITIES_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              <option value="Outra">Outra</option>
            </select>
          </div>

          {university === "Outra" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qual faculdade?</label>
              <input
                type="text"
                required={occupation === "estudante" && university === "Outra"}
                value={customUniversity}
                onChange={(e) => setCustomUniversity(e.target.value)}
                placeholder="Digite o nome da instituição"
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* PROFISSIONAL */}
      {occupation === "profissional" && (
        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área de Atuação</label>
            <select
              required={occupation === "profissional"}
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                if (e.target.value !== "Medicina") setSpecialty(""); 
              }}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white"
            >
              <option value="" disabled>Selecione sua área</option>
              {COURSES_LIST.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="Outra">Outra</option>
            </select>
          </div>

          {area === "Outra" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qual Área?</label>
              <input
                type="text"
                required={occupation === "profissional" && area === "Outra"}
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="Digite a sua área de atuação"
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>
          )}

          {area === "Medicina" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade Médica</label>
              <select
                required={occupation === "profissional" && area === "Medicina"}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white"
              >
                <option value="" disabled>Selecione sua especialidade</option>
                {SPECIALTIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}