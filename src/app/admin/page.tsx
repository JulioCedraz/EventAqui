'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, QrCode, Calendar, TrendingUp, 
  ChevronRight, PlusCircle 
} from "lucide-react";

export default function AdminHub() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const firstName = session?.user?.user_metadata?.first_name || '';

      const admins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

      if (!session || !userEmail || !admins.includes(userEmail)) {
        router.push('/');
      } else {
        setAuthorized(true);
        setUserName(firstName);
      }
      setIsCheckingAuth(false);
    };
    checkAdmin();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) return null;

  const menuActions = [
    {
      title: "Gerenciar Eventos",
      description: "Crie novos eventos ou edite os existentes.",
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      link: "/admin/events",
      buttonText: "Gerenciar",
      color: "bg-blue-50",
      btnClass: "bg-blue-50 text-blue-700 hover:bg-blue-100"
    },
    {
      title: "Vendas e Pedidos",
      description: "Acompanhe faturamento e histórico de transações.",
      icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
      link: "/admin/orders",
      buttonText: "Visualizar",
      color: "bg-emerald-50",
      btnClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    },
    {
      title: "Portaria (Scanner)",
      description: "Valide ingressos em tempo real via QR Code.",
      icon: <QrCode className="w-6 h-6 text-purple-600" />,
      link: "/admin/checkin",
      buttonText: "Acessar",
      color: "bg-purple-50",
      btnClass: "bg-purple-50 text-purple-700 hover:bg-purple-100"
    }
  ];

  return (
    <main className="bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        
        <div className="text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Painel Administrativo</h1>
          <p className="text-gray-500">
            {userName ? `Bem-vindo, ${userName}! ` : 'Bem-vindo! '}
            O que deseja fazer agora?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuActions.map((action, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden rounded-3xl">
              <CardHeader className={`${action.color} pb-8`}>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <CardTitle className="text-xl font-bold">{action.title}</CardTitle>
                <CardDescription className="text-gray-600 font-medium leading-tight">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <Link href={action.link}>
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