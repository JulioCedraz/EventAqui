'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Ban, ScanLine } from "lucide-react";

type QrcodeStatus = 'sucesso' | 'usado' | 'pendente' | 'invalido' | null;

export default function QRCodeReader() {
  const [mensagem, setMensagem] = useState('Aguardando leitura do QR Code...');
  const [statusValidacao, setStatusValidacao] = useState<QrcodeStatus>(null);
  const [lendo, setLendo] = useState(false);
  
  const scannerInicializado = useRef(false);

  useEffect(() => {
    if (scannerInicializado.current) return;
    scannerInicializado.current = true;

    const scanner = new Html5QrcodeScanner(
      'leitor-qr',
      { fps: 4, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);

    async function onScanSuccess(decodedText: string) {
      scanner.pause(true);
      setLendo(true);
      setMensagem('Validando ingresso no servidor...');
      setStatusValidacao(null);

      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingressoId: decodedText }),
        });

        const data = await res.json();

        if (data.erro) throw new Error(data.erro);

        setStatusValidacao(data.status);
        setMensagem(data.mensagem);

      } catch (err: any) {
        setStatusValidacao('invalido');
        setMensagem(err.message || 'Erro na conexão com o banco de dados.');
      } finally {
        setLendo(false);

        setTimeout(() => {
          setStatusValidacao(null);
          setMensagem('Aproxime o próximo QR Code');
          scanner.resume();
        }, 3000);
      }
    }

    function onScanFailure(error: any) {
    }

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const getStatusUI = () => {
    if (lendo) return { color: 'bg-blue-600 text-white', icon: <Loader2 className="w-16 h-16 animate-spin mb-3 mx-auto" />, title: 'PROCESSANDO...' };
    
    switch (statusValidacao) {
      case 'sucesso':
        return { color: 'bg-green-500 text-white', icon: <CheckCircle2 className="w-16 h-16 mb-3 mx-auto" />, title: 'LIBERADO' };
      case 'usado':
        return { color: 'bg-red-600 text-white', icon: <XCircle className="w-16 h-16 mb-3 mx-auto" />, title: 'BARRADO' };
      case 'pendente':
        return { color: 'bg-yellow-500 text-black', icon: <AlertTriangle className="w-16 h-16 mb-3 mx-auto" />, title: 'PAGAMENTO PENDENTE' };
      case 'invalido':
        return { color: 'bg-gray-800 text-white', icon: <Ban className="w-16 h-16 mb-3 mx-auto" />, title: 'INVÁLIDO' };
      default:
        return { color: 'bg-white text-gray-800', icon: <ScanLine className="w-16 h-16 mb-3 mx-auto text-blue-500" />, title: 'PRONTO' };
    }
  };

  const ui = getStatusUI();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-2xl overflow-hidden border-0">
        
        <CardHeader className="p-4 text-center bg-gray-900 text-white rounded-t-xl">
          <CardTitle className="text-xl font-extrabold tracking-tight">Controle de Portaria</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div id="leitor-qr" className="w-full bg-black min-h-75" />
          
          <div className={`p-8 text-center transition-colors duration-500 flex flex-col items-center justify-center min-h-55 ${ui.color}`}>
            {ui.icon}
            <h2 className="text-2xl font-black mb-2 tracking-wide">
              {ui.title}
            </h2>
            <p className={`font-medium text-lg leading-snug ${statusValidacao ? 'opacity-90' : 'text-gray-500'}`}>
              {mensagem}
            </p>
          </div>
        </CardContent>

      </Card>
    </div>
  );
}