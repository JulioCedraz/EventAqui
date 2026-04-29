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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center transition-colors">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Navegação e Título */}
        <div className="flex flex-col gap-2">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Scanner para Check-in</h1>
        </div>

        <Card className="shadow-lg border-gray-100 dark:border-border transition-colors">
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
              <div className="p-4 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl bg-white dark:bg-slate-900/50 animate-in zoom-in-95 transition-colors">
                <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 shadow-inner transition-colors">
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
                  <span className="w-full border-t border-gray-200 dark:border-border transition-colors" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-card px-2 text-muted-foreground font-bold transition-colors">Ou digite o ID</span>
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
                className="text-center h-14 text-lg font-mono rounded-xl bg-gray-50 dark:bg-slate-900 dark:border-slate-800 focus-visible:ring-blue-500 transition-colors"
              />
              <Button
                type="submit"
                disabled={loading || !ticketId.trim() || isScanning}
                className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white disabled:opacity-70 transition-colors"
              >
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Validando...</> : 'Validar Ingresso'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card Responsivo e Dinâmico do Resultado */}
        {result.status && (
          <Card className={`overflow-hidden border-2 animate-in slide-in-from-bottom-4 shadow-xl transition-colors ${
            result.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-900/50' : 
            result.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-400 dark:border-yellow-900/50' : 
            'bg-red-50 dark:bg-red-950/20 border-red-400 dark:border-red-900/50'
          }`}>
            <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
              
              <div className="flex items-center justify-center mb-4 transition-colors">
                {result.status === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-600 dark:text-emerald-500" />}
                {result.status === 'error' && <XCircle className="w-16 h-16 text-red-600 dark:text-red-500" />}
                {result.status === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-600 dark:text-yellow-500" />}
              </div>
              
              <h2 className={`text-2xl font-black mb-6 transition-colors ${
                result.status === 'success' ? 'text-emerald-800 dark:text-emerald-400' : 
                result.status === 'warning' ? 'text-yellow-800 dark:text-yellow-400' : 
                'text-red-800 dark:text-red-400'
              }`}>
                {result.message}
              </h2>

              {/* Retorno de dados do usuário */}
              {result.userData && (
                <div className="w-full bg-white dark:bg-slate-900/60 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-border text-left mt-2 transition-colors">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800 transition-colors">
                    <ShieldAlert className={`w-4 h-4 transition-colors ${result.status === 'success' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className={`text-xs uppercase tracking-widest font-extrabold transition-colors ${result.status === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Conferência de Identidade
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Participante</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none transition-colors">{result.userData.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">{result.userData.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800 transition-colors">
                      <div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Ocupação</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 transition-colors">{result.userData.occupation}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Evento</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 line-clamp-2 transition-colors">{result.userData.event}</p>
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