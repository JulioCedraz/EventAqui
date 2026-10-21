'use client';

import { useEffect, useState } from 'react';
import { callApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type PaymentSettings = { handle: string | null; keyHint: string | null };

export default function InfinitePayConnect() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [handle, setHandle] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    callApi<PaymentSettings>('/api/producer/payment-settings', 'GET')
      .then(setSettings)
      .catch(() => setSettings({ handle: null, keyHint: null }));
  }, []);

  const isConnected = !!settings?.handle && !!settings.keyHint;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const saved = await callApi<PaymentSettings>('/api/producer/payment-settings', 'PUT', { handle, apiKey });
      setSettings(saved);
      setIsEditing(false);
      setApiKey('');
      toast.success('Conta InfinitePay conectada! Você já pode receber por PIX e cartão.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const cardColor = isConnected
    ? "bg-emerald-50 dark:bg-emerald-950/30"
    : "bg-sky-50 dark:bg-sky-950/30 ring-2 ring-sky-400 dark:ring-sky-500";

  return (
    <Card className={`border-0 dark:border dark:border-border shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden rounded-3xl flex flex-col ${cardColor}`}>
      <CardHeader className="pb-4 grow transition-colors">
        <div className="w-12 h-12 bg-white dark:bg-card rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-all">
          <Wallet className={`w-6 h-6 transition-colors ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
        </div>
        <CardTitle className="text-xl font-bold dark:text-gray-100 transition-colors">Recebimento (InfinitePay)</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300 font-medium leading-tight transition-colors">
          {isConnected
            ? `Conectada como $${settings?.handle} (chave terminada em ${settings?.keyHint}).`
            : "Conecte sua conta InfinitePay para receber as vendas por PIX e cartão."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 pb-6 mt-auto transition-colors">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ip-handle">InfiniteTag</Label>
              <Input id="ip-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="sua-tag (sem o $)" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-key">API Key do Checkout</Label>
              <Input id="ip-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="inchk_..." required />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gere a chave no app InfinitePay, na aba Checkout. Para repassar os juros do cartão ao comprador, ative o repasse de taxas no app.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-11 rounded-xl font-bold">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-11 rounded-xl font-bold bg-sky-600 text-white hover:bg-sky-700">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            onClick={() => { setHandle(settings?.handle ?? ''); setIsEditing(true); }}
            disabled={!settings}
            className={`w-full h-11 rounded-xl font-bold border-transparent transition-colors ${isConnected
              ? "bg-white text-emerald-700 hover:bg-emerald-100 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-sky-600 text-white hover:bg-sky-700 shadow-md dark:bg-sky-600 dark:hover:bg-sky-700"}`}
          >
            {isConnected ? (
              <span className="flex items-center justify-center gap-2">Conta Conectada <CheckCircle2 className="w-4 h-4" /> Alterar</span>
            ) : (
              <span className="flex items-center justify-center gap-2">Conectar Conta <ChevronRight className="w-4 h-4 opacity-70" /></span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
