'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CheckCircle2, ArrowRight } from 'lucide-react';

interface MercadoPagoConnectProps {
  userId: string;
  isAlreadyConnected: boolean;
}

export default function MercadoPagoConnect({ userId, isAlreadyConnected }: MercadoPagoConnectProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    setIsLoading(true);
    
    const appId = process.env.NEXT_PUBLIC_MP_APP_ID;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eventaqui.vercel.app';
    const redirectUri = `${baseUrl}/api/auth/mercadopago/callback`;
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${userId}&redirect_uri=${redirectUri}`;
    
    window.location.href = authUrl;
  };

  return (
    <Card className="shadow-lg border-gray-100 dark:border-border dark:bg-card rounded-3xl overflow-hidden transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isAlreadyConnected ? 'bg-green-100 text-green-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Recebimentos e PIX</CardTitle>
            <CardDescription>
              {isAlreadyConnected 
                ? 'Sua conta bancária está vinculada e pronta para receber as vendas.' 
                : 'Conecte sua conta do Mercado Pago para receber o dinheiro das vendas em tempo real.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isAlreadyConnected ? (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-emerald-400" />
            <span className="font-semibold text-green-700 dark:text-emerald-400 text-sm">
              Conta do Mercado Pago conectada com sucesso!
            </span>
          </div>
        ) : (
          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full sm:w-auto h-12 bg-[#009EE3] hover:bg-[#0088C3] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Redirecionando...' : 'Conectar com Mercado Pago'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}