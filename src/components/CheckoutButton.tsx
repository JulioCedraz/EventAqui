'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, QrCode, Ticket } from "lucide-react";
import { toast } from "sonner";

interface CheckoutProps {
  eventoId: string;
}

export default function CheckoutButton({ eventoId }: CheckoutProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; pixCopiaECola: string } | null>(null);

  const handleComprar = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId, nomeComprador: nome, emailComprador: email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || 'Erro ao gerar pagamento');

      setPixData({
        qrCodeBase64: data.qrCodeBase64,
        pixCopiaECola: data.pixCopiaECola,
      });
      
      toast.success("Pix gerado com sucesso! Conclua o pagamento.");
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao processar o seu pedido.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarPix = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    toast.success("Código Copia e Cola copiado para a área de transferência!");
  };

  // VISTA 1: PIX GERADO COM SUCESSO
  if (pixData) {
    return (
      <Card className="w-full border-green-200 bg-green-50/50 shadow-md animate-in zoom-in-95 duration-500 overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800 tracking-tight">Ingresso Reservado!</CardTitle>
          <CardDescription className="text-green-700/80 font-medium mt-2">
            Escaneie o QR Code abaixo na app do seu banco para confirmar a compra.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center space-y-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100">
            <img 
              src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} 
              alt="QR Code Pix" 
              className="w-48 h-48 md:w-56 md:h-56 object-contain"
            />
          </div>
          
          {/* Pix Copia e Cola */}
          <div className="w-full space-y-2">
            <Label className="text-green-800 font-bold flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" />
              Ou use o Pix Copia e Cola:
            </Label>
            <div className="flex gap-2">
              <Input 
                type="text" 
                readOnly 
                value={pixData.pixCopiaECola} 
                className="font-mono text-xs bg-white border-green-200 focus-visible:ring-green-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button 
                type="button" 
                onClick={handleCopiarPix}
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // VISTA 2: FORMULÁRIO DE COMPRA
  return (
    <Card className="w-full shadow-lg border-gray-100">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-blue-600" />
          Garanta sua vaga
        </CardTitle>
        <CardDescription>
          Preencha os seus dados para gerar o pagamento via PIX.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleComprar} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input 
              id="nome"
              type="text" 
              required 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="h-12 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email"
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="h-12 rounded-xl"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Pix...
              </>
            ) : (
              'Comprar com Pix'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}