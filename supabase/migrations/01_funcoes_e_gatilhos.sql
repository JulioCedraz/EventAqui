-- =========================================================
-- 1. FUNÇÕES DE AUTORIZAÇÃO (SECURITY DEFINER)
-- =========================================================

-- Lê o cargo do usuário com velocidade extrema e segurança
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- CAIXA PRETA: Resolve o check-in ignorando pontos cegos de RLS
CREATE OR REPLACE FUNCTION public.is_ticket_manager(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_user_role text;
  v_user_producer_id uuid;
  v_event_producer_id uuid;
BEGIN
  -- Identifica quem está bipando
  SELECT role, producer_id INTO v_user_role, v_user_producer_id FROM public.profiles WHERE id = auth.uid();
  
  -- Se for Admin, aprova na hora
  IF v_user_role = 'admin' THEN RETURN true; END IF;
  
  -- Descobre o dono do evento do ingresso
  SELECT producer_id INTO v_event_producer_id FROM public.events WHERE id = p_event_id;
  
  -- Se for o próprio Produtor do evento, aprova
  IF v_user_role = 'producer' AND v_event_producer_id = auth.uid() THEN RETURN true; END IF;
  
  -- Se for o Agente contratado por este Produtor, aprova
  IF v_user_role = 'agent' AND v_user_producer_id = v_event_producer_id THEN RETURN true; END IF;
  
  RETURN false;
END;
$$;

-- =========================================================
-- 2. GATILHOS (TRIGGERS)
-- =========================================================

-- Sincronização automática Auth -> Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, cpf, occupation, role, producer_id, 
    birth_date, university, course, area, specialty, created_at,
    profile_type, cnpj, company_name, trading_name
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
    NULLIF(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'university', 
    new.raw_user_meta_data->>'course', 
    new.raw_user_meta_data->>'area', 
    new.raw_user_meta_data->>'specialty', 
    new.created_at,
    COALESCE(new.raw_user_meta_data->>'profile_type', 'PF'),
    new.raw_user_meta_data->>'cnpj',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'trading_name'
  )
  ON CONFLICT (id) DO UPDATE SET 
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

-- Proteção de alteração maliciosa pelo front-end
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se vier da API e o usuário NÃO for Admin, trava os campos sensíveis
  IF current_user IN ('authenticated', 'anon') AND public.get_user_role() != 'admin' THEN
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


-- =========================================================
-- 3. POLÍTICAS DE SEGURANÇA PARA CUPONS
-- =========================================================

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Política para ADMINS: Permissão total usando a função get_user_role()
DROP POLICY IF EXISTS "Admins podem tudo nos cupons" ON public.coupons;
CREATE POLICY "Admins podem tudo nos cupons" ON public.coupons
FOR ALL
TO authenticated
USING (
  public.get_user_role() = 'admin'
)
WITH CHECK (
  public.get_user_role() = 'admin'
);

-- Política para PRODUTORES: Acesso apenas aos cupons dos seus próprios eventos
DROP POLICY IF EXISTS "Produtores gerenciam seus proprios cupons" ON public.coupons;
CREATE POLICY "Produtores gerenciam seus proprios cupons" ON public.coupons
FOR ALL
TO authenticated
USING (
  producer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = coupons.event_id AND producer_id = auth.uid()
  )
)
WITH CHECK (
  producer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = coupons.event_id AND producer_id = auth.uid()
  )
);

-- Política de LEITURA GERAL: Necessária para validação de cupons na tela de checkout
DROP POLICY IF EXISTS "Leitura geral de cupons" ON public.coupons;
CREATE POLICY "Leitura geral de cupons" ON public.coupons
FOR SELECT
USING (true);