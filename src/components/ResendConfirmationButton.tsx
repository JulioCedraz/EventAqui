'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCw } from 'lucide-react';

const COOLDOWN_SECONDS = 60;

interface ResendConfirmationButtonProps {
  email: string;
  redirectTo: string;
  // Começa em espera quando o e-mail acabou de ser enviado (ex.: logo após o cadastro)
  startWithCooldown?: boolean;
  className?: string;
}

export default function ResendConfirmationButton({
  email,
  redirectTo,
  startWithCooldown = false,
  className = '',
}: ResendConfirmationButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(startWithCooldown ? COOLDOWN_SECONDS : 0);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (!email) {
      setStatus({ type: 'error', text: 'Digite o seu e-mail para receber um novo link.' });
      return;
    }

    setIsSending(true);
    setStatus(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setIsSending(false);

    if (error) {
      setStatus({ type: 'error', text: 'Não foi possível reenviar agora. Aguarde alguns instantes e tente novamente.' });
      return;
    }

    setStatus({ type: 'success', text: 'Novo link enviado! Confira sua caixa de entrada e a pasta de spam.' });
    setSecondsLeft(COOLDOWN_SECONDS);
  };

  const isCoolingDown = secondsLeft > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={handleResend}
        disabled={isSending || isCoolingDown}
        className="w-full py-5 rounded-xl font-semibold transition-colors"
      >
        {isSending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="mr-2 h-4 w-4" />
        )}
        Reenviar e-mail
        {isCoolingDown && (
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500 tabular-nums">
            ({secondsLeft}s)
          </span>
        )}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={`text-xs text-center min-h-4 transition-colors ${
          status?.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {status?.text}
      </p>
    </div>
  );
}
