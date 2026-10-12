import { supabase } from './supabase';

export type UserRole = 'admin' | 'producer' | 'agent' | 'customer';

export const ADMIN_ROLES: readonly UserRole[] = ['admin'];
export const PANEL_ROLES: readonly UserRole[] = ['admin', 'producer'];
export const SCANNER_ROLES: readonly UserRole[] = ['admin', 'producer', 'agent'];

const KNOWN_ROLES: readonly string[] = ['admin', 'producer', 'agent', 'customer'];

// Papel do usuário logado, lido de profiles (a única fonte). Sem perfil, é cliente.
export async function fetchOwnRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = data?.role ?? '';
  return KNOWN_ROLES.includes(role) ? (role as UserRole) : 'customer';
}
