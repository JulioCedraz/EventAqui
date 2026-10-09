import 'server-only';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';

// Valida o access token enviado pelo cliente no header Authorization.
export async function getRequestUser(request: Request): Promise<User | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}
