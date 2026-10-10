'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ResendConfirmationButton from '@/components/ResendConfirmationButton';
import { Inbox, LogIn, MailCheck, MousePointerClick, PencilLine, Ticket } from 'lucide-react';

interface SignupConfirmationCardProps {
  email: string;
  redirectTo: string;
  isGuestClaim: boolean;
  onCorrectEmail: () => void;
}

export default function SignupConfirmationCard({ email, redirectTo, isGuestClaim, onCorrectEmail }: SignupConfirmationCardProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // O foco no título anuncia a troca de tela para leitores de tela
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    titleRef.current?.focus();
  }, []);

  const steps = [
    { icon: Inbox, text: <>Abra o e-mail enviado pelo <strong className="text-gray-900 dark:text-gray-100">EventAqui</strong>.</> },
    { icon: MousePointerClick, text: 'Clique no link de confirmação.' },
    isGuestClaim
      ? { icon: Ticket, text: 'Você volta direto para o resgate do seu ingresso, já conectado.' }
      : { icon: LogIn, text: 'Depois, entre com seu e-mail e a senha que acabou de criar.' },
  ];

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl shadow-blue-900/5 dark:shadow-none rounded-3xl border-gray-100 dark:border-border dark:bg-card animate-in fade-in zoom-in-95 duration-500 ease-out transition-colors">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
          <MailCheck className="w-8 h-8" />
        </div>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight outline-none transition-colors"
        >
          Conta criada! Falta confirmar seu e-mail
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 transition-colors">
          Enviamos um link de confirmação para
        </p>
        <p className="text-base font-bold text-gray-900 dark:text-gray-100 break-all transition-colors">
          {email}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, text }, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300 transition-colors">
              <span className="w-7 h-7 shrink-0 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors">
                <Icon className="w-4 h-4" />
              </span>
              <span className="pt-1">{text}</span>
            </li>
          ))}
        </ol>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 transition-colors">
          Não encontrou? Confira as pastas de spam e promoções.
        </p>

        <ResendConfirmationButton email={email} redirectTo={redirectTo} startWithCooldown />
      </CardContent>

      <CardFooter className="flex justify-center border-t border-gray-100 dark:border-border pt-6 transition-colors">
        <Button
          variant="ghost"
          type="button"
          onClick={onCorrectEmail}
          className="w-full text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        >
          <PencilLine className="mr-2 h-4 w-4" />
          Corrigir e-mail
        </Button>
      </CardFooter>
    </Card>
  );
}
