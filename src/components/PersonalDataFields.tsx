'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

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
  if (year < 1900 || year > new Date().getFullYear() || month === 0 || month > 12) return false;
  const maxDays = new Date(year, month, 0).getDate();
  if (day === 0 || day > maxDays) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 12);
  const inputDate = new Date(year, month - 1, day);
  if (inputDate > minDate) return false;
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

export const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const basePersonalDataSchema = z.object({
  profileType: z.enum(['PF', 'PJ']),
  // PF Fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  university: z.string().optional(),
  customUniversity: z.string().optional(),
  course: z.string().optional(),
  customCourse: z.string().optional(),
  semester: z.string().optional(),
  enrollmentNumber: z.string().optional(),
  // PJ Fields
  companyName: z.string().optional(),
  tradingName: z.string().optional(),
  cnpj: z.string().optional()
});

export const refinePersonalData = (data: any, ctx: z.RefinementCtx) => {
  if (data.profileType === 'PF') {
    if (!data.firstName || data.firstName.trim().length < 2) {
      ctx.addIssue({ path: ['firstName'], message: "Nome é obrigatório", code: z.ZodIssueCode.custom });
    }
    if (!data.lastName || data.lastName.trim().length < 2) {
      ctx.addIssue({ path: ['lastName'], message: "Sobrenome é obrigatório", code: z.ZodIssueCode.custom });
    }
    if (!data.cpf || !validateCPF(data.cpf)) {
      ctx.addIssue({ path: ['cpf'], message: "CPF inválido", code: z.ZodIssueCode.custom });
    }
    if (!data.birthDate || !validateBirthDate(data.birthDate)) {
      ctx.addIssue({ path: ['birthDate'], message: "Data inválida", code: z.ZodIssueCode.custom });
    }
    if (!data.phone || data.phone.length < 14) {
      ctx.addIssue({ path: ['phone'], message: "Telefone inválido", code: z.ZodIssueCode.custom });
    }
    if (!data.semester || data.semester.trim() === '') {
      ctx.addIssue({ path: ['semester'], message: "Semestre é obrigatório", code: z.ZodIssueCode.custom });
    }
    if (!data.enrollmentNumber || data.enrollmentNumber.trim() === '') {
      ctx.addIssue({ path: ['enrollmentNumber'], message: "Matrícula é obrigatória", code: z.ZodIssueCode.custom });
    }
    if (!data.university) {
      ctx.addIssue({ path: ['university'], message: "Universidade é obrigatória", code: z.ZodIssueCode.custom });
    } else if (data.university === 'Outra' && (!data.customUniversity || data.customUniversity.trim().length < 2)) {
      ctx.addIssue({ path: ['customUniversity'], message: "Especifique a universidade", code: z.ZodIssueCode.custom });
    }
    if (!data.course) {
      ctx.addIssue({ path: ['course'], message: "Curso é obrigatório", code: z.ZodIssueCode.custom });
    } else if (data.course === 'Outro' && (!data.customCourse || data.customCourse.trim().length < 2)) {
      ctx.addIssue({ path: ['customCourse'], message: "Especifique o curso", code: z.ZodIssueCode.custom });
    }
  } else {
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({ path: ['companyName'], message: "Razão social é obrigatória", code: z.ZodIssueCode.custom });
    }
    if (!data.cnpj || !validateCNPJ(data.cnpj)) {
      ctx.addIssue({ path: ['cnpj'], message: "CNPJ inválido", code: z.ZodIssueCode.custom });
    }
  }
};

interface PersonalDataFieldsProps {
  form: UseFormReturn<any>;
  hasCpfInitially?: boolean;
}

export default function PersonalDataFields({ form, hasCpfInitially = false }: PersonalDataFieldsProps) {
  const profileType = form.watch('profileType');
  const university = form.watch('university');
  const course = form.watch('course');
  
  const { errors } = form.formState;
  const selectClassName = "flex h-12 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
      {profileType === 'PF' ? (
        <>
          {/* NOME E SOBRENOME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                type="text"
                {...form.register("firstName")}
                className={`h-12 rounded-xl transition-colors ${errors.firstName ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.firstName && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.firstName.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                type="text"
                {...form.register("lastName")}
                className={`h-12 rounded-xl transition-colors ${errors.lastName ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.lastName && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.lastName.message)}</p>}
            </div>
          </div>

          {/* CPF E DATA DE NASCIMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                disabled={hasCpfInitially}
                {...form.register("cpf", {
                  onChange: (e) => {
                    e.target.value = formatCPF(e.target.value);
                  }
                })}
                className={`h-12 rounded-xl transition-colors ${hasCpfInitially ? 'bg-gray-100 dark:bg-slate-800 text-gray-500' : errors.cpf ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.cpf && !hasCpfInitially && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.cpf.message)}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="text"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                {...form.register("birthDate", {
                  onChange: (e) => {
                    e.target.value = formatBirthDate(e.target.value);
                  }
                })}
                className={`h-12 rounded-xl transition-colors ${errors.birthDate ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.birthDate && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.birthDate.message)}</p>}
            </div>
          </div>

          {/* TELEFONE E MATRÍCULA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="(00) 00000-0000"
                maxLength={15}
                {...form.register("phone", {
                  onChange: (e) => {
                    e.target.value = formatPhone(e.target.value);
                  }
                })}
                className={`h-12 rounded-xl transition-colors ${errors.phone ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.phone && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.phone.message)}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="enrollmentNumber">Nº de Matrícula</Label>
              <Input
                id="enrollmentNumber"
                type="text"
                placeholder="Sua matrícula acadêmica"
                {...form.register("enrollmentNumber")}
                className={`h-12 rounded-xl transition-colors ${errors.enrollmentNumber ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
              />
              {errors.enrollmentNumber && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.enrollmentNumber.message)}</p>}
            </div>
          </div>

          {/* UNIVERSIDADE E CURSO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">Instituição de Ensino</Label>
              <select
                id="university"
                {...form.register("university")}
                className={`${selectClassName} ${errors.university ? 'border-red-400' : ''}`}
              >
                <option value="" disabled>Selecione sua universidade</option>
                {UNIVERSITIES_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                <option value="Outra">Outra</option>
              </select>
              {errors.university && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.university.message)}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="course">Curso</Label>
              <select
                id="course"
                {...form.register("course")}
                className={`${selectClassName} ${errors.course ? 'border-red-400' : ''}`}
              >
                <option value="" disabled>Selecione seu curso</option>
                {COURSES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Outro">Outro</option>
              </select>
              {errors.course && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.course.message)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {university === "Outra" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="customUniversity">Qual faculdade?</Label>
                <Input
                  id="customUniversity"
                  type="text"
                  placeholder="Digite o nome da instituição"
                  {...form.register("customUniversity")}
                  className={`h-12 rounded-xl transition-colors ${errors.customUniversity ? 'border-red-400' : ''}`}
                />
                {errors.customUniversity && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.customUniversity.message)}</p>}
              </div>
            )}
            
            {course === "Outro" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="customCourse">Qual curso?</Label>
                <Input
                  id="customCourse"
                  type="text"
                  placeholder="Digite o nome do seu curso"
                  {...form.register("customCourse")}
                  className={`h-12 rounded-xl transition-colors ${errors.customCourse ? 'border-red-400' : ''}`}
                />
                {errors.customCourse && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.customCourse.message)}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="semester">Semestre Atual</Label>
              <select
                id="semester"
                {...form.register("semester")}
                className={`${selectClassName} ${errors.semester ? 'border-red-400' : ''}`}
              >
                <option value="" disabled>Ex: 1º Semestre</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={`${i + 1}º Semestre`}>{i + 1}º Semestre</option>
                ))}
                <option value="Concluído">Já Concluído</option>
              </select>
              {errors.semester && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.semester.message)}</p>}
            </div>
          </div>
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
              {...form.register("companyName")}
              className={`h-12 rounded-xl transition-colors ${errors.companyName ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
            />
            {errors.companyName && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.companyName.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingName">Nome Fantasia (Opcional)</Label>
            <Input
              id="tradingName"
              type="text"
              placeholder="Como a sua empresa é conhecida"
              {...form.register("tradingName")}
              className="h-12 rounded-xl transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              {...form.register("cnpj", {
                onChange: (e) => {
                  e.target.value = formatCNPJ(e.target.value);
                }
              })}
              className={`h-12 rounded-xl transition-colors ${errors.cnpj ? 'border-red-400 focus-visible:ring-red-400 bg-red-50/50 dark:border-red-500/50 dark:bg-red-500/10' : ''}`}
            />
            {errors.cnpj && <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{String(errors.cnpj.message)}</p>}
          </div>
        </>
      )}
    </div>
  );
}