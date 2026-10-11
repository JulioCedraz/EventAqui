'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PixData } from '../types';

export function PixPaymentCard({ pixData }: { pixData: PixData }) {
  const router = useRouter();
  const [copiedPix, setCopiedPix] = useState(false);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopiedPix(true);
      toast.success('Código PIX copiado com sucesso!');
      setTimeout(() => setCopiedPix(false), 2000);
    } catch (error) {
      console.error('Falha ao copiar PIX:', error);
      toast.error('Não foi possível copiar o código automaticamente.');
    }
  };

  return (
    <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 shadow-sm animate-in zoom-in-95 duration-500 transition-colors">
      <CardContent className="p-8 text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 transition-colors">
          <QrCode className="w-7 h-7 text-emerald-600 dark:text-emerald-400 transition-colors" />
        </div>
        <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-2 transition-colors">Pague com PIX</h3>
        <p className="text-emerald-700 dark:text-emerald-500 font-medium mb-8 transition-colors">Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 inline-block transition-colors">
          <img
            src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
            alt="QR Code PIX Mercado Pago"
            className="w-56 h-56 object-contain"
          />
        </div>

        <div className="w-full max-w-md mb-8">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-500 mb-2 text-left ml-1 transition-colors">Ou copie o código (PIX Copia e Cola):</p>
          <div className="flex gap-2">
            <Input
              type="text"
              readOnly
              value={pixData.qr_code}
              className="font-mono text-xs bg-white dark:bg-slate-900 dark:border-slate-700/50 dark:text-gray-300 h-12 rounded-xl focus-visible:ring-emerald-500 transition-colors"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              onClick={copyPix}
              className={`h-12 px-6 rounded-xl font-bold transition-all shrink-0 shadow-sm ${
                copiedPix ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-900 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
              }`}
            >
              {copiedPix ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <Button
          onClick={() => router.push('/tickets')}
          className="w-full max-w-md h-14 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors"
        >
          Ir para Meus Ingressos
        </Button>
      </CardContent>
    </Card>
  );
}
