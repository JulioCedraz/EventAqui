-- =========================================================
-- ROLLBACK DA MIGRATION 05 - ENDURECIMENTO DE SEGURANÇA
--
-- ATENÇÃO: restaura o estado de produção anterior à 05, INCLUINDO as
-- falhas de segurança (escalada para admin, dados de convidados públicos,
-- ingressos aprovados pelo cliente). Use só em emergência e por pouco tempo.
--
-- Depois de rodar este script, volte também o código na Vercel para o
-- deploy anterior ao merge da branch fix/security-hardening.
-- A migration 04 não precisa de rollback.
-- =========================================================

BEGIN;

-- =========================================================
-- 1. REMOVE POLÍTICAS CRIADAS PELA 05
-- (antes das funções, porque dependem delas)
-- =========================================================
DROP POLICY IF EXISTS "Tickets - Cancelamento pelo comprador" ON public.tickets;
DROP POLICY IF EXISTS "Tickets - Exclusão pelo comprador" ON public.tickets;
DROP POLICY IF EXISTS "Guests - Leitura" ON public.guests;
DROP POLICY IF EXISTS "Cupons - Leitura pelo comprador" ON public.coupons;

-- =========================================================
-- 2. RESTAURA AS POLÍTICAS ANTERIORES
-- =========================================================

-- PROFILES
DROP POLICY IF EXISTS "Profiles - Inserção" ON public.profiles;
CREATE POLICY "Profiles - Inserção" ON public.profiles FOR INSERT WITH CHECK (
  (id = auth.uid()) OR (public.get_user_role() = 'admin')
);

DROP POLICY IF EXISTS "Profiles - Atualização" ON public.profiles;
CREATE POLICY "Profiles - Atualização" ON public.profiles FOR UPDATE USING (
  (id = auth.uid()) OR (public.get_user_role() = 'admin')
);

-- EVENTS
DROP POLICY IF EXISTS "Events - Inserção" ON public.events;
CREATE POLICY "Events - Inserção" ON public.events FOR INSERT WITH CHECK (
  public.get_user_role() = ANY (ARRAY['admin', 'producer'])
);

DROP POLICY IF EXISTS "Events - Atualização" ON public.events;
CREATE POLICY "Events - Atualização" ON public.events FOR UPDATE USING (
  (public.get_user_role() = 'admin') OR (producer_id = auth.uid())
);

-- TICKETS
DROP POLICY IF EXISTS "Tickets - Leitura" ON public.tickets;
CREATE POLICY "Tickets - Leitura" ON public.tickets FOR SELECT USING (
  (user_id = auth.uid())
  OR (buyer_email = (auth.jwt() ->> 'email'))
  OR public.is_ticket_manager(event_id)
  OR (id IN (SELECT guests.ticket_id FROM public.guests))
);

DROP POLICY IF EXISTS "Tickets - Inserção" ON public.tickets;
CREATE POLICY "Tickets - Inserção" ON public.tickets FOR INSERT WITH CHECK (
  (user_id = auth.uid()) OR (public.get_user_role() = ANY (ARRAY['admin', 'producer']))
);

DROP POLICY IF EXISTS "Tickets - Atualização" ON public.tickets;
CREATE POLICY "Tickets - Atualização" ON public.tickets FOR UPDATE USING (
  public.is_ticket_manager(event_id)
);

DROP POLICY IF EXISTS "Tickets - Resgate pelo Convidado" ON public.tickets;
CREATE POLICY "Tickets - Resgate pelo Convidado" ON public.tickets FOR UPDATE USING (
  id IN (SELECT guests.ticket_id FROM public.guests WHERE guests.is_claimed = false)
);

-- GUESTS
DROP POLICY IF EXISTS "Guests - Leitura pelo comprador" ON public.guests;
CREATE POLICY "Guests - Leitura pelo comprador" ON public.guests FOR SELECT USING (
  auth.uid() = buyer_id
);

DROP POLICY IF EXISTS "Guests - Inserção pelo comprador" ON public.guests;
CREATE POLICY "Guests - Inserção pelo comprador" ON public.guests FOR INSERT WITH CHECK (
  auth.uid() = buyer_id
);

DROP POLICY IF EXISTS "Guests - Leitura pública via link" ON public.guests;
CREATE POLICY "Guests - Leitura pública via link" ON public.guests FOR SELECT USING (
  true
);

DROP POLICY IF EXISTS "Guests - Atualização pelo amigo" ON public.guests;
CREATE POLICY "Guests - Atualização pelo amigo" ON public.guests FOR UPDATE USING (
  (auth.uid() IS NOT NULL) AND (is_claimed = false)
) WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Guests - Edição única pelo comprador" ON public.guests;
CREATE POLICY "Guests - Edição única pelo comprador" ON public.guests FOR UPDATE USING (
  (auth.uid() = buyer_id) AND (is_claimed = false) AND (has_been_edited = false)
) WITH CHECK (
  (auth.uid() = buyer_id) AND (is_claimed = false)
);

-- COUPONS
DROP POLICY IF EXISTS "Produtores gerenciam seus proprios cupons" ON public.coupons;
CREATE POLICY "Produtores gerenciam seus proprios cupons" ON public.coupons
FOR ALL
TO authenticated
USING (
  (producer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.events WHERE events.id = coupons.event_id AND events.producer_id = auth.uid())
)
WITH CHECK (
  (producer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.events WHERE events.id = coupons.event_id AND events.producer_id = auth.uid())
);

DROP POLICY IF EXISTS "Leitura geral de cupons" ON public.coupons;
CREATE POLICY "Leitura geral de cupons" ON public.coupons FOR SELECT USING (
  true
);

-- =========================================================
-- 3. RESTAURA TRIGGERS E FUNÇÕES ANTERIORES
-- =========================================================
DROP TRIGGER IF EXISTS enforce_ticket_protection ON public.tickets;
DROP TRIGGER IF EXISTS enforce_guest_protection ON public.guests;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, cpf, phone, role, producer_id,
    birth_date, university, course, semester, enrollment_number, created_at,
    profile_type, cnpj, company_name, trading_name
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    (new.raw_user_meta_data->>'producer_id')::uuid,
    NULLIF(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'semester',
    new.raw_user_meta_data->>'enrollment_number',
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

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND public.get_user_role() != 'admin' THEN
    NEW.role = OLD.role;
    NEW.producer_id = OLD.producer_id;
    NEW.status = OLD.status;
    NEW.deletion_scheduled_at = OLD.deletion_scheduled_at;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.protect_sensitive_profile_fields() RESET search_path;

DROP TRIGGER IF EXISTS enforce_profile_protection ON public.profiles;
CREATE TRIGGER enforce_profile_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- =========================================================
-- 4. REMOVE FUNÇÕES CRIADAS PELA 05
-- increment_coupon_usage fica: o código atual depende dela.
-- =========================================================
DROP FUNCTION IF EXISTS public.protect_ticket_fields();
DROP FUNCTION IF EXISTS public.protect_guest_fields();
DROP FUNCTION IF EXISTS public.can_read_coupon(uuid);
DROP FUNCTION IF EXISTS public.can_manage_ticket(uuid);
DROP FUNCTION IF EXISTS public.is_guest_claimer(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_end_user_request();

COMMIT;
