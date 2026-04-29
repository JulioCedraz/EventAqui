'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, QrCode, Calendar, TrendingUp, 
  ChevronRight, ShieldCheck, Briefcase 
} from "lucide-react";

export default function AdminHub() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email;
      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', userId)
        .single();
        
      const role = profile?.role || 'customer';
      const firstName = profile?.first_name || session.user.user_metadata?.first_name || '';
      const isAdmin = admins.includes(userEmail || '') || role === 'admin';
      const isProducer = role === 'producer';

      if (!isAdmin && !isProducer) {
        toast.error('Você não tem permissão para acessar esta área.', { id: 'unauthorized-access' });
        router.push('/');
      } else {
        setAuthorized(true);
        setUserName(firstName);
      }
      
      setIsCheckingAuth(false);
    };

    checkAccess();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    );
  }

  if (!authorized) return null;

  const menuActions = [
    {
      title: "Gerenciar Eventos",
      description: "Crie novos eventos ou edite os existentes.",
      icon: <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors" />,
      link: "/admin/events",
      buttonText: "Gerenciar",
      color: "bg-blue-50 dark:bg-blue-950/30",
      btnClass: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
    },
    {
      title: "Vendas e Pedidos",
      description: "Acompanhe faturamento e histórico de transações.",
      icon: <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400 transition-colors" />,
      link: "/admin/orders",
      buttonText: "Visualizar",
      color: "bg-emerald-50 dark:bg-emerald-950/30",
      btnClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
    },
    {
      title: "Portaria (Scanner)",
      description: "Valide ingressos em tempo real via QR Code.",
      icon: <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400 transition-colors" />,
      link: "/admin/checkin",
      buttonText: "Acessar",
      color: "bg-purple-50 dark:bg-purple-950/30",
      btnClass: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
    },
    {
      title: "Produtores",
      description: "Autorize produtores a criar eventos na plataforma.",
      icon: <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400 transition-colors" />,
      link: "/admin/producers",
      buttonText: "Gerenciar",
      color: "bg-indigo-50 dark:bg-indigo-950/30",
      btnClass: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
    },
    {
      title: "Equipe de Portaria",
      description: "Controle quem tem acesso ao scanner de ingressos.",
      icon: <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 transition-colors" />,
      link: "/admin/agents",
      buttonText: "Configurar",
      color: "bg-amber-50 dark:bg-amber-950/30",
      btnClass: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
    }
  ];

  return (
    <main className="bg-gray-50 dark:bg-background py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center transition-colors">
      <div className="w-full max-w-5xl space-y-8">
        
        <div className="text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Painel Administrativo</h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">
            {userName ? `Bem-vindo, ${userName}! ` : 'Bem-vindo! '}
            O que deseja fazer agora?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuActions.map((action, index) => (
            <Card key={index} className="border-0 dark:border dark:border-border dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden rounded-3xl flex flex-col bg-transparent">
              <CardHeader className={`${action.color} pb-8 grow transition-colors`}>
                <div className="w-12 h-12 bg-white dark:bg-card rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-all">
                  {action.icon}
                </div>
                <CardTitle className="text-xl font-bold dark:text-gray-100 transition-colors">{action.title}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 font-medium leading-tight transition-colors">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white dark:bg-card mt-auto transition-colors">
                <Link href={action.link} className="block w-full">
                  <Button 
                    className={`w-full h-11 rounded-xl font-bold border-transparent cursor-pointer shadow-none transition-colors ${action.btnClass}`}
                  >
                    {action.buttonText}
                    <ChevronRight className="w-4 h-4 ml-2 opacity-70" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </main>
  );
}