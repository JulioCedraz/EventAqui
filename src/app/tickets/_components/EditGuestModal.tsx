import { Edit3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GuestEditForm } from '../types';

type Props = {
  form: GuestEditForm;
  isSubmitting: boolean;
  onChange: (field: keyof Omit<GuestEditForm, 'id'>, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const labelClass = 'block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5';
const inputClass = 'h-12 rounded-xl bg-white dark:bg-slate-900';

export default function EditGuestModal({ form, isSubmitting, onChange, onCancel, onSave }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border-0 dark:bg-card">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800/50">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-500" />
            Editar Convidado
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            Atenção: Por questões de segurança, esta alteração só pode ser feita <strong className="text-red-500 dark:text-red-400 font-bold">uma única vez</strong>. Verifique os dados com cuidado.
          </p>
        </div>

        <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/20">
          <div>
            <label className={labelClass}>Nome Completo *</label>
            <Input
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Nome do convidado"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>E-mail *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="email@exemplo.com"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CPF *</label>
              <Input
                value={form.cpf}
                onChange={(e) => onChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <Input
                value={form.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="p-6 flex gap-3 border-t border-gray-100 dark:border-slate-800/50">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl font-bold dark:border-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Dados'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
