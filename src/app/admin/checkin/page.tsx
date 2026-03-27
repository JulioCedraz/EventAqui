'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckinPage() {
  const router = useRouter();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ 
    status: 'success' | 'error' | 'warning' | null, 
    message: string,
    userData?: { fullName: string, cpf: string, occupation: string }
  }>({ status: null, message: '' });
  
  const [isScanning, setIsScanning] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        router.push('/');
      } else {
        setAuthorized(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      setIsCheckingAuth(false);
    };

    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!isScanning) return;

    let html5QrcodeScanner: any = null;

    const startScanner = async () => {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );

      html5QrcodeScanner.render(
        (decodedText: string) => {
          setTicketId(decodedText);
          setIsScanning(false);
          html5QrcodeScanner.clear();
          handleCheckin(null, decodedText); 
        },
        (error: any) => {
        }
      );
    };

    startScanner();

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleCheckin = async (e?: React.SyntheticEvent | null, scannedId?: string) => {
    if (e) e.preventDefault();
    
    const idToValidate = (scannedId || ticketId).trim();
    if (!idToValidate) return;

    setLoading(true);
    setResult({ status: null, message: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticketId: idToValidate })
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ status: 'error', message: data.error || 'Erro ao validar ingresso.' });
        return;
      }

      if (data.status === 'success') {
        setResult({ 
          status: 'success', 
          message: data.message,
          userData: data.userData 
        });
      } else if (data.status === 'used' || data.status === 'invalid') {
        setResult({ status: 'error', message: data.message });
      } else if (data.status === 'pending') {
        setResult({ status: 'warning', message: data.message });
      }

    } catch (error) {
      setResult({ status: 'error', message: 'Falha de conexão com o servidor.' });
    } finally {
      setLoading(false);
      setTicketId('');
      if (!isScanning) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 grow flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center transition-colors">
            &larr; Voltar ao Painel
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900">Portaria / Check-in</h1>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200">
          
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-sm transition-colors border ${
                isScanning 
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                  : 'bg-gray-900 text-white border-transparent hover:bg-gray-800'
              }`}
            >
              {isScanning ? 'Fechar Câmera' : '📷 Ler com a Câmera do Celular'}
            </button>
          </div>

          {isScanning && (
            <div className="mb-8 p-2 border-2 border-blue-100 rounded-2xl bg-gray-50 animate-in fade-in">
              <div id="qr-reader" className="w-full mx-auto overflow-hidden rounded-xl"></div>
              <p className="text-xs text-center text-gray-500 mt-3 font-medium">
                Aponte a câmera para o QR Code do ingresso.
              </p>
            </div>
          )}

          {!isScanning && (
            <div className="text-center mb-6">
              <p className="text-gray-500 font-medium">Ou use o leitor físico / digite o ID manualmente:</p>
            </div>
          )}

          <form onSubmit={handleCheckin} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Ex: 123e4567-e89b-12d3..."
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                disabled={loading || isScanning}
                className="block w-full text-center text-lg font-mono border-2 border-gray-300 rounded-xl py-4 px-4 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !ticketId.trim() || isScanning}
              className="w-full bg-blue-600 border border-transparent rounded-xl shadow-sm py-4 px-8 text-lg font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all disabled:opacity-50"
            >
              {loading ? 'Validando...' : 'Validar Ingresso'}
            </button>
          </form>

          {result.status && (
            <div className={`mt-8 p-6 rounded-2xl border-2 text-center animate-in fade-in slide-in-from-bottom-4 ${
              result.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
              result.status === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex justify-center mb-2">
                {result.status === 'success' && (
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {result.status === 'error' && (
                  <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {result.status === 'warning' && (
                  <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <p className="text-xl font-bold">{result.message}</p>

              {result.status === 'success' && result.userData && (
                <div className="mt-6 bg-white border border-green-200 rounded-xl p-5 text-left shadow-sm inline-block w-full max-w-sm">
                  <p className="text-xs uppercase tracking-wider text-green-600 font-bold mb-3 border-b border-green-100 pb-2">
                    Conferência Obrigatória
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Nome do Titular</p>
                      <p className="text-lg font-bold text-gray-900">{result.userData.fullName}</p>
                    </div>
                    
                    <div className="flex justify-between items-end gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">CPF</p>
                        <p className="text-md font-mono font-semibold text-gray-800">{result.userData.cpf}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium">Ocupação</p>
                        <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                          {result.userData.occupation || 'Não informada'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}