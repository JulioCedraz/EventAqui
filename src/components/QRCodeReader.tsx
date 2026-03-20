'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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

  const bgColors = {
    sucesso: 'bg-green-500 text-white',
    usado: 'bg-red-600 text-white',
    pendente: 'bg-yellow-500 text-black',
    invalido: 'bg-gray-800 text-white',
    null: 'bg-white text-gray-800'
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        
        <div className="p-4 text-center bg-gray-900 text-white">
          <h1 className="text-xl font-bold">Controle de Portaria</h1>
        </div>

        <div id="leitor-qr" className="w-full bg-black min-h-75" />

        <div className={`p-6 text-center transition-colors duration-300 ${bgColors[statusValidacao ?? 'null']}`}>
          {lendo && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-4" />
          )}
          <h2 className="text-xl font-bold mb-2">
            {statusValidacao === 'sucesso' && '✅ LIBERADO'}
            {statusValidacao === 'usado' && '❌ BARRADO'}
            {statusValidacao === 'pendente' && '⚠️ PAGAMENTO PENDENTE'}
            {statusValidacao === 'invalido' && '🚫 INVÁLIDO'}
            {!statusValidacao && !lendo && '📷 PRONTO'}
          </h2>
          <p className="font-medium text-lg">{mensagem}</p>
        </div>
      </div>
    </div>
  );
}