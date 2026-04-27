-- ==========================================
-- FUNÇÕES DE SEGURANÇA E AUTH
-- ==========================================

-- Leitura do cargo do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Permissões vitais para o Supabase conseguir usar a função do Hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token FROM authenticated, anon, public;

-- ==========================================
-- GATILHOS (TRIGGERS)
-- ==========================================

-- Upsert do Profile Automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, cpf, occupation, role, 
    producer_id, birth_date, university, course, area, specialty, created_at
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'occupation',
    COALESCE(new.raw_user_meta_data->>'role', 'customer'), 
    (new.raw_user_meta_data->>'producer_id')::uuid,
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'area',
    new.raw_user_meta_data->>'specialty',
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, profiles.role),
    producer_id = COALESCE(EXCLUDED.producer_id, profiles.producer_id);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================
-- 2. GATILHO DE BLINDAGEM (Substitui o WITH CHECK)
-- ==============================================================
  CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se a requisição vier da API pública do frontend (usuário logado ou visitante)
  IF current_user IN ('authenticated', 'anon') THEN
    -- Trava silenciosamente as colunas sensíveis, mantendo os valores originais.
    NEW.role = OLD.role;
    NEW.producer_id = OLD.producer_id;
    NEW.status = OLD.status;
    NEW.deletion_scheduled_at = OLD.deletion_scheduled_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_protection ON public.profiles;
CREATE TRIGGER enforce_profile_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_sensitive_profile_fields();


-- ==============================================================
-- BYPASS MESTRE: ACESSO DE LEITURA PARA O ADMINISTRADOR
-- ==============================================================
DROP POLICY IF EXISTS "Admin Bypass - Leitura" ON public.profiles;

CREATE POLICY "Admin Bypass - Leitura" ON public.profiles 
FOR SELECT USING (public.get_user_role() = 'admin');