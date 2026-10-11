import { supabase } from './supabase';

// Chama a API com o token da sessão. Lança erro com a mensagem do servidor, quando houver.
export async function callApi(path: string, method: 'PATCH' | 'DELETE', body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Entre novamente.');

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.ok) return;

  const data = await res.json().catch(() => null);
  throw new Error(typeof data?.error === 'string' ? data.error : 'Falha na requisição.');
}

export const cancelTicket = (ticketId: string) => callApi(`/api/tickets/${ticketId}`, 'PATCH', { action: 'cancel' });
