'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PendingOrderCard({ eventId, ticketId, onCancel }: { eventId: string; ticketId: string; onCancel: () => void }) {
  const router = useRouter();

  return (
    <Card className="bg-yellow-50/80 dark:bg-amber-950/20 border-yellow-200 dark:border-amber-900/50 shadow-sm animate-in fade-in transition-colors">
      <CardContent className="p-8 text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-yellow-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-4 transition-colors">
          <Info className="w-7 h-7 text-yellow-600 dark:text-amber-500 transition-colors" />
        </div>
        <h3 className="text-2xl font-bold text-yellow-900 dark:text-amber-400 mb-3 transition-colors">Você tem um pedido pendente!</h3>
        <p className="text-yellow-800 dark:text-amber-500 font-medium mb-8 max-w-lg transition-colors">
          Identificamos que você já iniciou a compra de seu ingresso para este evento. O pagamento aguarda confirmação.
        </p>

        <div className="flex flex-col md:flex-row gap-3 w-full max-w-md">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 font-bold rounded-xl transition-colors"
          >
            Cancelar Pedido
          </Button>
          <Button
            onClick={() => router.push(`/evento/${eventId}/${ticketId}`)}
            className="flex-1 h-12 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 font-bold rounded-xl shadow-sm transition-colors"
          >
            Continuar Pagamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovedTicketCard() {
  const router = useRouter();

  return (
    <Card className="bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 shadow-sm animate-in fade-in transition-colors">
      <CardContent className="p-8 text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 transition-colors">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-500 transition-colors" />
        </div>
        <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-3 transition-colors">Vaga Garantida!</h3>
        <p className="text-emerald-800 dark:text-emerald-500 font-medium mb-8 max-w-lg transition-colors">
          Você já garantiu o seu ingresso para este evento. Só é permitido a emissão de apenas um ingresso por pessoa, vinculado ao CPF.
        </p>

        <Button
          onClick={() => router.push('/tickets')}
          className="w-full max-w-md h-12 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 font-bold rounded-xl shadow-sm transition-colors"
        >
          Ver Meu Ingresso
        </Button>
      </CardContent>
    </Card>
  );
}

export function SoldOutCard() {
  return (
    <Card className="bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 shadow-none transition-colors">
      <CardContent className="p-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 transition-colors">
          <AlertTriangle className="w-8 h-8 text-gray-500 dark:text-gray-400 transition-colors" />
        </div>
        <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 transition-colors">Esgotado</h3>
        <p className="text-gray-500 dark:text-gray-400 text-lg transition-colors">Infelizmente, todas as vagas para este evento já foram preenchidas.</p>
      </CardContent>
    </Card>
  );
}
