'use client';

import { Calendar, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EventFormValues } from '../types';

const CHECKBOX_CLASS = 'rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-colors';
const DISABLED_INPUT_CLASS = 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500';

type Props = {
  isEditing: boolean;
  values: EventFormValues;
  update: (patch: Partial<EventFormValues>) => void;
  imageError: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function InlineCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={CHECKBOX_CLASS}
      />
      <span>{label}</span>
    </label>
  );
}

export function EventDetailsCard({ isEditing, values, update, imageError, onImageChange }: Props) {
  return (
    <Card className={`shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden ${isEditing ? 'ring-2 ring-blue-500/50 shadow-blue-500/10' : 'dark:border dark:border-border'}`}>
      <CardHeader className="border-b border-gray-100 dark:border-border pb-6 transition-colors">
        <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
          {isEditing ? <><Pencil className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Formulário de Edição</> : <><Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Informações do Evento</>}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="title">Título do Evento</Label>
            <Input
              id="title"
              required
              value={values.title}
              onChange={(e) => update({ title: e.target.value })}
              className="h-12 rounded-xl transition-colors"
              placeholder="Ex: Simpósio de Medicina 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              rows={6}
              required
              value={values.description}
              onChange={(e) => update({ description: e.target.value })}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
              placeholder="Detalhes sobre o evento, palestrantes, local..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="eventDate">Data e Hora</Label>
                <InlineCheckbox
                  label="Sem data definida"
                  checked={values.hasNoDate}
                  onChange={(checked) => update(checked ? { hasNoDate: true, eventDate: '' } : { hasNoDate: false })}
                />
              </div>
              <Input
                id="eventDate"
                type="datetime-local"
                required={!values.hasNoDate}
                disabled={values.hasNoDate}
                value={values.eventDate}
                onChange={(e) => update({ eventDate: e.target.value })}
                className={`h-12 rounded-xl transition-colors ${values.hasNoDate ? DISABLED_INPUT_CLASS : ''}`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="price">Preço (R$)</Label>
                <InlineCheckbox
                  label="Gratuito"
                  checked={values.isFree}
                  onChange={(checked) => update({ isFree: checked, price: checked ? '0' : '' })}
                />
              </div>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required={!values.isFree}
                disabled={values.isFree}
                value={values.isFree ? '0' : values.price}
                onChange={(e) => update({ price: e.target.value })}
                className={`h-12 rounded-xl transition-colors ${values.isFree ? DISABLED_INPUT_CLASS : ''}`}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="totalSpots">Vagas Totais</Label>
                <InlineCheckbox
                  label="Sem limite"
                  checked={values.hasNoSpotLimit}
                  onChange={(checked) => update(checked ? { hasNoSpotLimit: true, totalSpots: '' } : { hasNoSpotLimit: false })}
                />
              </div>
              <Input
                id="totalSpots"
                type="number"
                min="1"
                required={!values.hasNoSpotLimit}
                disabled={values.hasNoSpotLimit}
                value={values.totalSpots}
                onChange={(e) => update({ totalSpots: e.target.value })}
                className={`h-12 rounded-xl transition-colors ${values.hasNoSpotLimit ? DISABLED_INPUT_CLASS : ''}`}
                placeholder="Ex: 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">
                Capa do Evento {isEditing && <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>}
              </Label>
              <Input
                id="image"
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={onImageChange}
                className={`h-12 rounded-xl cursor-pointer pt-2.5 transition-colors ${
                  imageError ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400' : ''
                }`}
              />
              {imageError ? (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in flex items-center gap-1 transition-colors">
                  {imageError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground transition-colors">JPEG, PNG ou WEBP (Max: 3MB).</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
