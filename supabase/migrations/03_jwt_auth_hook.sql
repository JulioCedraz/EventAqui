-- ==========================================
-- 1. AUTH HOOK: O "CRACHÁ" DE PERFORMANCE
-- ==========================================

-- Esta função injeta o cargo do usuário diretamente no Token JWT no momento do login
CREATE OR REPLACE FUNCTION public.custom_access_token(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Faz apenas uma única consulta, na hora que o usuário loga
  SELECT role::text INTO user_role FROM public.profiles WHERE id = (event->>'user_id')::uuid;
  
  -- Carimba a 'role' no token. Se não tiver, vira 'customer'.
  event := jsonb_set(event, '{claims, user_role}', to_jsonb(COALESCE(user_role, 'customer')));
  
  RETURN event;
END;
$$;

-- Permissões vitais para o Supabase conseguir usar a função do Hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token FROM authenticated, anon, public;

-- ==========================================
-- 2. FUNÇÃO DE ATALHO (Leitura do Crachá)
-- ==========================================

-- Lê o cargo instantaneamente da memória, sem tocar no banco de dados! O(1)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', 'customer')::text;
$$;