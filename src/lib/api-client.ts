import { supabase } from './supabase';

// Chama a API com o token da sessão e devolve o JSON da resposta. Lança erro com a mensagem do servidor, quando houver.
export async function callApi<T = void>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
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

  const data = await res.json().catch(() => null);
  if (res.ok) return data as T;

  throw new Error(typeof data?.error === 'string' ? data.error : 'Falha na requisição.');
}

export const cancelTicket = (ticketId: string) => callApi(`/api/tickets/${ticketId}`, 'PATCH', { action: 'cancel' });
