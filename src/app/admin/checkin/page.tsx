'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Camera, CameraOff, Loader2, CheckCircle2, 
  XCircle, AlertTriangle, ScanBarcode, ShieldAlert 
} from "lucide-react";

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
        (error: any) => { }
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Navegação e Título */}
        <div className="flex flex-col gap-2">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 flex items-center transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Portaria / Check-in</h1>
        </div>

        <Card className="shadow-lg border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle>Validação de Ingressos</CardTitle>
            <CardDescription>Escaneie o QR Code ou digite o ID manualmente.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Controle da Câmera */}
            <Button
              variant={isScanning ? "destructive" : "default"}
              onClick={() => setIsScanning(!isScanning)}
              className="w-full h-14 text-base font-bold rounded-xl"
            >
              {isScanning ? (
                <><CameraOff className="w-5 h-5 mr-2" /> Fechar Câmera</>
              ) : (
                <><Camera className="w-5 h-5 mr-2" /> Ler com a Câmera do Celular</>
              )}
            </Button>

            {isScanning && (
              <div className="p-2 border-2 border-blue-100 rounded-2xl bg-gray-50 animate-in zoom-in-95">
                <div id="qr-reader" className="w-full mx-auto overflow-hidden rounded-xl bg-black"></div>
                <p className="text-sm text-center text-muted-foreground mt-3 font-medium flex items-center justify-center gap-2">
                  <ScanBarcode className="w-4 h-4" />
                  Aponte a câmera para o QR Code
                </p>
              </div>
            )}

            {!isScanning && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground font-bold">Ou digite o ID</span>
                </div>
              </div>
            )}

            {/* Formulário de ID Manual */}
            <form onSubmit={handleCheckin} className="space-y-4">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Ex: 123e4567-e89b..."
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                disabled={loading || isScanning}
                className="text-center h-14 text-lg font-mono rounded-xl bg-gray-50 focus-visible:ring-blue-500"
              />
              <Button
                type="submit"
                disabled={loading || !ticketId.trim() || isScanning}
                className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Validando...</> : 'Validar Ingresso'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resultado da Validação */}
        {result.status && (
          <Card className={`overflow-hidden border-2 animate-in slide-in-from-bottom-4 shadow-xl ${
            result.status === 'success' ? 'bg-green-50 border-green-400' : 
            result.status === 'warning' ? 'bg-yellow-50 border-yellow-400' : 
            'bg-red-50 border-red-400'
          }`}>
            <CardContent className="p-8 flex flex-col items-center text-center">
              {result.status === 'success' && <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />}
              {result.status === 'error' && <XCircle className="w-16 h-16 text-red-600 mb-4" />}
              {result.status === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-600 mb-4" />}
              
              <h2 className={`text-2xl font-black mb-6 ${
                result.status === 'success' ? 'text-green-800' : 
                result.status === 'warning' ? 'text-yellow-800' : 
                'text-red-800'
              }`}>
                {result.message}
              </h2>

              {/* Box com Dados do Usuário */}
              {result.status === 'success' && result.userData && (
                <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-green-100 text-left">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <ShieldAlert className="w-4 h-4 text-green-600" />
                    <span className="text-xs uppercase tracking-widest text-green-700 font-extrabold">
                      Conferência de Identidade
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Nome do Titular</p>
                      <p className="text-xl font-bold text-gray-900 leading-none">{result.userData.fullName}</p>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Documento (CPF)</p>
                        <p className="text-lg font-mono font-semibold text-gray-800">{result.userData.cpf}</p>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-sm">
                          {result.userData.occupation || 'Não informada'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}