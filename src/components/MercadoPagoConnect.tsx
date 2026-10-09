'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MercadoPagoConnectProps {
  isAlreadyConnected: boolean;
}

export default function MercadoPagoConnect({ isAlreadyConnected }: MercadoPagoConnectProps) {
  const [isLoading, setIsLoading] = useState(false);

  // O servidor gera o "state" do OAuth e o vincula a esta sessão via cookie
  const handleConnect = async () => {
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/auth/mercadopago/start', {
        method: 'POST',
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a conexão.');

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.');
      setIsLoading(false);
    }
  };

  const cardColor = isAlreadyConnected 
    ? "bg-emerald-50 dark:bg-emerald-950/30" 
    : "bg-sky-50 dark:bg-sky-950/30 ring-2 ring-sky-400 dark:ring-sky-500";

  const btnClass = isAlreadyConnected
    ? "bg-white text-emerald-700 cursor-default shadow-none dark:bg-emerald-500/20 dark:text-emerald-400"
    : "bg-sky-600 text-white hover:bg-sky-700 shadow-md dark:bg-sky-600 dark:hover:bg-sky-700";

  return (
    <Card className={`border-0 dark:border dark:border-border dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden rounded-3xl flex flex-col ${cardColor}`}>
      <CardHeader className="pb-4 grow transition-colors">
        <div className="w-12 h-12 bg-white dark:bg-card rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-all">
          <Wallet className={`w-6 h-6 transition-colors ${isAlreadyConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
        </div>
        <CardTitle className="text-xl font-bold dark:text-gray-100 transition-colors">Conta Bancária (PIX)</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300 font-medium leading-tight transition-colors">
          {isAlreadyConnected 
            ? "Sua conta do Mercado Pago está vinculada." 
            : "Vincule sua conta para receber as vendas via PIX."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 pb-6 mt-auto transition-colors">
        <Button 
          onClick={isAlreadyConnected ? undefined : handleConnect}
          disabled={isAlreadyConnected || isLoading}
          className={`w-full h-11 rounded-xl font-bold border-transparent transition-colors ${btnClass}`}
        >
          {isAlreadyConnected ? (
            <span className="flex items-center justify-center gap-2">Conta Conectada <CheckCircle2 className="w-4 h-4" /></span>
          ) : isLoading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">Conectar Conta <ChevronRight className="w-4 h-4 opacity-70" /></span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}