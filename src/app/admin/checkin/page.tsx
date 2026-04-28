'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
    userData?: { name: string, email: string, occupation: string, event: string }
  }>({ status: null, message: '' });
  
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      const role = profile?.role || 'customer';
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      const isAdmin = admins.includes(session.user.email || '') || role === 'admin';
      const hasAccess = isAdmin || role === 'producer' || role === 'agent';

      if (!hasAccess) {
        toast.error('Acesso negado.', { id: 'unauthorized-checkin' });
        router.push('/');
      } else {
        setAuthorized(true);
      }
      setIsCheckingAuth(false);
    };
    checkAccess();
  }, [router]);

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
        setResult({ 
          status: 'error', 
          message: data.error || 'Erro ao validar ingresso.',
          userData: data.userData
        });
        toast.error(data.error || 'Erro ao validar ingresso.');
        return;
      }

      setResult({ 
        status: 'success', 
        message: data.message,
        userData: data.userData 
      });
      toast.success(data.message);

    } catch (error) {
      setResult({ status: 'error', message: 'Falha de conexão com o servidor.' });
      toast.error('Falha de conexão com o servidor.');
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Scanner para Check-in</h1>
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
                <><Camera className="w-5 h-5 mr-2" /> Abrir Câmera</>
              )}
            </Button>

            {/* Componente do Scanner */}
            {isScanning && (
              <div className="p-4 border-2 border-blue-100 rounded-2xl bg-white animate-in zoom-in-95">
                <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-gray-100 shadow-inner">
                  <Scanner
                    onScan={(scanResult) => {
                      if (scanResult && scanResult.length > 0) {
                        const code = scanResult[0].rawValue;
                        setTicketId(code);
                        setIsScanning(false);
                        handleCheckin(null, code);
                      }
                    }}
                    onError={(error) => {
                      console.log("Aguardando leitura...", error);
                    }}
                    components={{ finder: true }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground mt-4 font-medium flex items-center justify-center gap-2">
                  <ScanBarcode className="w-4 h-4" />
                  Centralize o QR Code na câmera
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

        {/* Card Responsivo e Dinâmico do Resultado */}
        {result.status && (
          <Card className={`overflow-hidden border-2 animate-in slide-in-from-bottom-4 shadow-xl ${
            result.status === 'success' ? 'bg-emerald-50 border-emerald-400' : 
            result.status === 'warning' ? 'bg-yellow-50 border-yellow-400' : 
            'bg-red-50 border-red-400'
          }`}>
            <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
              
              <div className="flex items-center justify-center mb-4">
                {result.status === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-600" />}
                {result.status === 'error' && <XCircle className="w-16 h-16 text-red-600" />}
                {result.status === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-600" />}
              </div>
              
              <h2 className={`text-2xl font-black mb-6 ${
                result.status === 'success' ? 'text-emerald-800' : 
                result.status === 'warning' ? 'text-yellow-800' : 
                'text-red-800'
              }`}>
                {result.message}
              </h2>

              {/* Card de dados do usuário */}
              {result.userData && (
                <div className="w-full bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 text-left mt-2">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <ShieldAlert className={`w-4 h-4 ${result.status === 'success' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-xs uppercase tracking-widest font-extrabold ${result.status === 'success' ? 'text-emerald-700' : 'text-gray-500'}`}>
                      Conferência de Identidade
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Participante</p>
                      <p className="text-xl font-bold text-gray-900 leading-none">{result.userData.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{result.userData.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ocupação</p>
                        <p className="text-sm font-bold text-blue-600">{result.userData.occupation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Evento</p>
                        <p className="text-sm font-bold text-gray-700 line-clamp-2">{result.userData.event}</p>
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