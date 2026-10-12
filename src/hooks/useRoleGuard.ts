'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchOwnRole, type UserRole } from '@/lib/roles';

export type RoleAccess = { uid: string; role: UserRole; isAdmin: boolean };

type GuardOptions = {
  allow: readonly UserRole[];
  deniedMessage: string;
  deniedRedirect?: string;
  toastId?: string;
};

// Só decide o que a tela mostra: quem protege os dados são a RLS e as rotas da API.
// Fica nulo enquanto confere e quando o acesso é negado (a página já está sendo redirecionada).
export function useRoleGuard({ allow, deniedMessage, deniedRedirect = '/', toastId }: GuardOptions) {
  const router = useRouter();
  const [access, setAccess] = useState<RoleAccess | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      const role = await fetchOwnRole(session.user.id);

      if (!allow.includes(role)) {
        toast.error(deniedMessage, { id: toastId });
        router.push(deniedRedirect);
        return;
      }

      setAccess({ uid: session.user.id, role, isAdmin: role === 'admin' });
    };

    checkAccess();
  }, [allow, deniedMessage, deniedRedirect, toastId, router]);

  return access;
}
