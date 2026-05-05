'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle } from "lucide-react";

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

export const validateCNPJ = (cnpj: string) => {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
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
  minDate.setFullYear(today.getFullYear() - 12);
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

export const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
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
  profileType: 'PF' | 'PJ';
  
  // Props de Pessoa Física (PF)
  firstName: string; setFirstName: (val: string) => void;
  lastName: string; setLastName: (val: string) => void;
  cpf: string; setCpf: (val: string) => void;
  hasCpfInitially?: boolean;
  cpfStatus: 'idle' | 'valid' | 'invalid'; setCpfStatus: (val: 'idle' | 'valid' | 'invalid') => void;
  cpfMessage: string; setCpfMessage: (val: string) => void;
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

  // Props de Pessoa Jurídica (PJ)
  companyName: string; setCompanyName: (val: string) => void;
  tradingName: string; setTradingName: (val: string) => void;
  cnpj: string; setCnpj: (val: string) => void;
  cnpjStatus: 'idle' | 'valid' | 'invalid'; setCnpjStatus: (val: 'idle' | 'valid' | 'invalid') => void;
}

export default function PersonalDataFields({
  profileType,
  firstName, setFirstName, lastName, setLastName,
  cpf, setCpf, hasCpfInitially = false, cpfStatus, setCpfStatus, cpfMessage, setCpfMessage,
  birthDate, setBirthDate, birthDateStatus, setBirthDateStatus, birthDateMessage, setBirthDateMessage,
  occupation, setOccupation,
  course, setCourse, customCourse, setCustomCourse,
  university, setUniversity, customUniversity, setCustomUniversity,
  area, setArea, customArea, setCustomArea,
  specialty, setSpecialty,
  companyName, setCompanyName,
  tradingName, setTradingName,
  cnpj, setCnpj, cnpjStatus, setCnpjStatus
}: PersonalDataFieldsProps) {

  const handleCpfBlur = () => {
    if (hasCpfInitially || !cpf) {
      setCpfStatus('idle');
      setCpfMessage('');
      return;
    }
    
    if (validateCPF(cpf)) {
      setCpfStatus('valid');
      setCpfMessage('');
    } else {
      setCpfStatus('invalid');
      setCpfMessage('CPF inválido. Verifique os números digitados.');
    }
  };

  const handleCnpjBlur = () => {
    if (!cnpj) {
      setCnpjStatus('idle');
      return;
    }

    if (validateCNPJ(cnpj)) {
      setCnpjStatus('valid');
    } else {
      setCnpjStatus('invalid');
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

  const selectClassName = "flex h-12 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
      
      {profileType === 'PF' ? (
        // ==========================================
        // CAMPOS DE PESSOA FÍSICA (PF)
        // ==========================================
        <>
          {/* NOME E SOBRENOME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 rounded-xl transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 rounded-xl transition-colors"
              />
            </div>
          </div>

          {/* CPF E DATA DE NASCIMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <div className="relative">
                <Input
                  id="cpf"
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
                  className={`h-12 rounded-xl transition-colors ${
                    hasCpfInitially
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 opacity-100'
                      : cpfStatus === 'valid'
                        ? 'border-green-400 dark:border-emerald-500 focus-visible:ring-green-400 dark:focus-visible:ring-emerald-500 bg-green-50/50 dark:bg-emerald-500/10'
                        : cpfStatus === 'invalid'
                          ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400 dark:focus-visible:ring-red-500 bg-red-50/50 dark:bg-red-500/10'
                          : ''
                  }`}
                />
                {!hasCpfInitially && cpfStatus === 'valid' && (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-5 h-5 text-green-500 dark:text-emerald-400 animate-in zoom-in" />
                )}
                {!hasCpfInitially && cpfStatus === 'invalid' && (
                  <AlertCircle className="absolute right-3 top-3.5 w-5 h-5 text-red-500 dark:text-red-400 animate-in zoom-in" />
                )}
              </div>
              {cpfMessage && !hasCpfInitially && (
                <p className={`text-xs font-medium animate-in fade-in slide-in-from-top-1 ${cpfStatus === 'valid' ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {cpfMessage}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <div className="relative">
                <Input
                  id="birthDate"
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
                  className={`h-12 rounded-xl transition-colors ${
                    birthDateStatus === 'valid'
                      ? 'border-green-400 dark:border-emerald-500 focus-visible:ring-green-400 dark:focus-visible:ring-emerald-500 bg-green-50/50 dark:bg-emerald-500/10'
                      : birthDateStatus === 'invalid'
                        ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400 dark:focus-visible:ring-red-500 bg-red-50/50 dark:bg-red-500/10'
                        : ''
                  }`}
                />
                {birthDateStatus === 'valid' && (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-5 h-5 text-green-500 dark:text-emerald-400 animate-in zoom-in" />
                )}
                {birthDateStatus === 'invalid' && (
                  <AlertCircle className="absolute right-3 top-3.5 w-5 h-5 text-red-500 dark:text-red-400 animate-in zoom-in" />
                )}
              </div>
              {birthDateMessage && (
                <p className={`text-xs font-medium animate-in fade-in slide-in-from-top-1 ${birthDateStatus === 'valid' ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {birthDateMessage}
                </p>
              )}
            </div>
          </div>

          {/* OCUPAÇÃO */}
          <div className="space-y-3 pt-2">
            <Label className="text-gray-700 dark:text-gray-300 transition-colors">Ocupação</Label>
            <div className="flex gap-6">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="radio"
                  name="occupation"
                  value="estudante"
                  checked={occupation === 'estudante'}
                  onChange={() => setOccupation('estudante')}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-slate-800 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">Estudante</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="radio"
                  name="occupation"
                  value="profissional"
                  checked={occupation === 'profissional'}
                  onChange={() => setOccupation('profissional')}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-slate-800 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">Profissional</span>
              </label>
            </div>
          </div>

          {/* ESTUDANTE */}
          {occupation === "estudante" && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-border animate-in fade-in slide-in-from-top-2 duration-300 transition-colors">
              <div className="space-y-2">
                <Label>Curso</Label>
                <select
                  required={occupation === "estudante"}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className={selectClassName}
                >
                  <option value="" disabled>Selecione seu curso</option>
                  {COURSES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {course === "Outro" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Qual curso?</Label>
                  <Input
                    type="text"
                    required={occupation === "estudante" && course === "Outro"}
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    placeholder="Digite o nome do seu curso"
                    className="h-12 rounded-xl transition-colors"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Instituição de Ensino</Label>
                <select
                  required={occupation === "estudante"}
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className={selectClassName}
                >
                  <option value="" disabled>Selecione sua universidade</option>
                  {UNIVERSITIES_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="Outra">Outra</option>
                </select>
              </div>

              {university === "Outra" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Qual faculdade?</Label>
                  <Input
                    type="text"
                    required={occupation === "estudante" && university === "Outra"}
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    placeholder="Digite o nome da instituição"
                    className="h-12 rounded-xl transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          {/* PROFISSIONAL */}
          {occupation === "profissional" && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-border animate-in fade-in slide-in-from-top-2 duration-300 transition-colors">
              <div className="space-y-2">
                <Label>Área de Atuação</Label>
                <select
                  required={occupation === "profissional"}
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    if (e.target.value !== "Medicina") setSpecialty(""); 
                  }}
                  className={selectClassName}
                >
                  <option value="" disabled>Selecione sua área</option>
                  {COURSES_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="Outra">Outra</option>
                </select>
              </div>

              {area === "Outra" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Qual Área?</Label>
                  <Input
                    type="text"
                    required={occupation === "profissional" && area === "Outra"}
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="Digite a sua área de atuação"
                    className="h-12 rounded-xl transition-colors"
                  />
                </div>
              )}

              {area === "Medicina" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Especialidade Médica</Label>
                  <select
                    required={occupation === "profissional" && area === "Medicina"}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Selecione sua especialidade</option>
                    {SPECIALTIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        // ==========================================
        // CAMPOS DE PESSOA JURÍDICA (PJ)
        // ==========================================
        <>
          <div className="space-y-2">
            <Label htmlFor="companyName">Razão Social (Nome da Empresa) *</Label>
            <Input 
              id="companyName" 
              type="text"
              required 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="Ex: EventAqui Tecnologia LTDA"
              className="h-12 rounded-xl transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingName">Nome Fantasia (Opcional)</Label>
            <Input 
              id="tradingName" 
              type="text"
              value={tradingName} 
              onChange={(e) => setTradingName(e.target.value)} 
              placeholder="Como a sua empresa é conhecida"
              className="h-12 rounded-xl transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <div className="relative">
              <Input 
                id="cnpj" 
                type="text"
                required 
                value={cnpj} 
                onChange={(e) => {
                  setCnpj(formatCNPJ(e.target.value));
                  if (cnpjStatus !== 'idle') {
                    setCnpjStatus('idle');
                  }
                }}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0000-00"
                className={`h-12 rounded-xl transition-colors ${
                  cnpjStatus === 'valid'
                    ? 'border-green-400 dark:border-emerald-500 focus-visible:ring-green-400 dark:focus-visible:ring-emerald-500 bg-green-50/50 dark:bg-emerald-500/10'
                    : cnpjStatus === 'invalid'
                      ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400 dark:focus-visible:ring-red-500 bg-red-50/50 dark:bg-red-500/10'
                      : ''
                }`}
              />
              {cnpjStatus === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-3.5 w-5 h-5 text-green-500 dark:text-emerald-400 animate-in zoom-in" />
              )}
              {cnpjStatus === 'invalid' && (
                <AlertCircle className="absolute right-3 top-3.5 w-5 h-5 text-red-500 dark:text-red-400 animate-in zoom-in" />
              )}
            </div>
            {cnpjStatus === 'invalid' && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                CNPJ inválido. Verifique os números digitados.
              </p>
            )}
          </div>
        </>
      )}

    </div>
  );
}