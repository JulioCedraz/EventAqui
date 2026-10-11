import 'server-only';
import { createClient, type User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';

// Valida o access token enviado pelo cliente no header Authorization.
export async function getRequestUser(request: Request): Promise<User | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

// Papel sempre lido de profiles (nunca de user_metadata, que o usuário edita).
export async function getUserRole(user: User) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const role = profile?.role ?? 'customer';
  const isAdmin = role === 'admin' || adminEmails.includes((user.email ?? '').toLowerCase());

  return { role, isAdmin };
}

// Confere a senha no servidor. A sessão criada pela checagem é revogada em seguida,
// sem afetar a sessão em que o usuário está logado.
export async function verifyPassword(email: string, password: string) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;

  await client.auth.signOut({ scope: 'local' });
  return true;
}
