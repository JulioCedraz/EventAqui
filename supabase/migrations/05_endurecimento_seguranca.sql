-- =========================================================
-- 05 - ENDURECIMENTO DE SEGURANÇA
-- Pré-requisito: código da branch fix/security-hardening já em produção
-- (ingressos, convidados e cupons passam a ser gravados pelo servidor).
-- Idempotente: pode ser executada mais de uma vez.
-- =========================================================

BEGIN;

-- =========================================================
-- 1. FUNÇÕES AUXILIARES
-- =========================================================

-- Verdadeiro quando a requisição vem do app (anon key + JWT do usuário).
-- Service role, SQL Editor e o próprio Auth retornam falso.
CREATE OR REPLACE FUNCTION public.is_end_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') IN ('authenticated', 'anon');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(public.get_user_role(), '') = 'admin';
$$;

-- SECURITY DEFINER evita recursão entre as políticas de tickets, guests e coupons.
CREATE OR REPLACE FUNCTION public.is_guest_claimer(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guests
    WHERE ticket_id = p_ticket_id AND claimed_by_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT public.is_ticket_manager(event_id) FROM public.tickets WHERE id = p_ticket_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_coupon(p_coupon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.coupon_id = p_coupon_id
      AND (t.user_id = auth.uid() OR public.is_guest_claimer(t.id))
  );
$$;

-- Incremento atômico do uso de cupom. Só o servidor (service role) executa.
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.coupons SET used_count = coalesce(used_count, 0) + 1 WHERE id = p_coupon_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO service_role;

-- =========================================================
-- 2. PROFILES: papel nunca vem do cliente
-- =========================================================

-- Cadastro: todo usuário nasce 'customer'. Papéis são atribuídos pelo servidor.
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
    'customer',
    NULL,
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
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN new;
END;
$$;

-- Versão anterior usava current_user, que dentro de SECURITY DEFINER é o dono
-- da função; a proteção nunca era aplicada.
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'customer';
    NEW.producer_id := NULL;
    NEW.status := 'active';
    NEW.deletion_scheduled_at := NULL;
    NEW.mp_access_token := NULL;
    NEW.mp_refresh_token := NULL;
    NEW.mp_user_id := NULL;
    NEW.mp_public_key := NULL;
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.role := OLD.role;
  NEW.producer_id := OLD.producer_id;
  NEW.status := OLD.status;
  NEW.deletion_scheduled_at := OLD.deletion_scheduled_at;
  NEW.mp_access_token := OLD.mp_access_token;
  NEW.mp_refresh_token := OLD.mp_refresh_token;
  NEW.mp_user_id := OLD.mp_user_id;
  NEW.mp_public_key := OLD.mp_public_key;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_protection ON public.profiles;
CREATE TRIGGER enforce_profile_protection
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- O perfil é criado pelo trigger de cadastro; o cliente não insere perfis.
DROP POLICY IF EXISTS "Profiles - Inserção" ON public.profiles;
CREATE POLICY "Profiles - Inserção" ON public.profiles FOR INSERT WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Profiles - Atualização" ON public.profiles;
CREATE POLICY "Profiles - Atualização" ON public.profiles FOR UPDATE USING (
  id = auth.uid() OR public.is_admin()
) WITH CHECK (
  id = auth.uid() OR public.is_admin()
);

-- =========================================================
-- 3. EVENTS: produtor só cria e edita eventos próprios
-- =========================================================
DROP POLICY IF EXISTS "Events - Inserção" ON public.events;
CREATE POLICY "Events - Inserção" ON public.events FOR INSERT WITH CHECK (
  public.is_admin() OR (public.get_user_role() = 'producer' AND producer_id = auth.uid())
);

DROP POLICY IF EXISTS "Events - Atualização" ON public.events;
CREATE POLICY "Events - Atualização" ON public.events FOR UPDATE USING (
  public.is_admin() OR producer_id = auth.uid()
) WITH CHECK (
  public.is_admin() OR producer_id = auth.uid()
);

-- =========================================================
-- 4. TICKETS: criação e aprovação apenas pelo servidor
-- =========================================================
DROP POLICY IF EXISTS "Tickets - Resgate pelo Convidado" ON public.tickets;
DROP POLICY IF EXISTS "Tickets - Inserção" ON public.tickets;

DROP POLICY IF EXISTS "Tickets - Leitura" ON public.tickets;
CREATE POLICY "Tickets - Leitura" ON public.tickets FOR SELECT USING (
  user_id = auth.uid()
  OR buyer_email = (auth.jwt()->>'email')
  OR public.is_ticket_manager(event_id)
  OR public.is_guest_claimer(id)
);

DROP POLICY IF EXISTS "Tickets - Atualização" ON public.tickets;
CREATE POLICY "Tickets - Atualização" ON public.tickets FOR UPDATE USING (
  public.is_ticket_manager(event_id)
) WITH CHECK (
  public.is_ticket_manager(event_id)
);

DROP POLICY IF EXISTS "Tickets - Cancelamento pelo comprador" ON public.tickets;
CREATE POLICY "Tickets - Cancelamento pelo comprador" ON public.tickets FOR UPDATE USING (
  user_id = auth.uid() AND payment_status = 'pending'
) WITH CHECK (
  user_id = auth.uid() AND payment_status = 'cancelled'
);

-- Pelo app, só muda: is_used (gestor do evento) e pending -> cancelled.
CREATE OR REPLACE FUNCTION public.protect_ticket_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (NEW.id, NEW.event_id, NEW.user_id, NEW.coupon_id, NEW.buyer_name, NEW.buyer_email,
      NEW.quantity, NEW.pix_qr_code, NEW.pix_qr_code_base64, NEW.expires_at, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.event_id, OLD.user_id, OLD.coupon_id, OLD.buyer_name, OLD.buyer_email,
      OLD.quantity, OLD.pix_qr_code, OLD.pix_qr_code_base64, OLD.expires_at, OLD.created_at) THEN
    RAISE EXCEPTION 'Alteração não permitida neste ingresso.' USING ERRCODE = '42501';
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NOT (OLD.payment_status = 'pending' AND NEW.payment_status = 'cancelled') THEN
    RAISE EXCEPTION 'Alteração de status não permitida.' USING ERRCODE = '42501';
  END IF;

  IF NEW.is_used IS DISTINCT FROM OLD.is_used AND NOT public.is_ticket_manager(OLD.event_id) THEN
    RAISE EXCEPTION 'Apenas a equipe do evento pode validar ingressos.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ticket_protection ON public.tickets;
CREATE TRIGGER enforce_ticket_protection
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.protect_ticket_fields();

-- =========================================================
-- 5. GUESTS: dados pessoais visíveis só para envolvidos
-- =========================================================
DROP POLICY IF EXISTS "Guests - Leitura pública via link" ON public.guests;
DROP POLICY IF EXISTS "Guests - Atualização pelo amigo" ON public.guests;
DROP POLICY IF EXISTS "Guests - Inserção pelo comprador" ON public.guests;

DROP POLICY IF EXISTS "Guests - Leitura pelo comprador" ON public.guests;
DROP POLICY IF EXISTS "Guests - Leitura" ON public.guests;
CREATE POLICY "Guests - Leitura" ON public.guests FOR SELECT USING (
  buyer_id = auth.uid()
  OR claimed_by_user_id = auth.uid()
  OR public.can_manage_ticket(ticket_id)
);

DROP POLICY IF EXISTS "Guests - Edição única pelo comprador" ON public.guests;
CREATE POLICY "Guests - Edição única pelo comprador" ON public.guests FOR UPDATE USING (
  auth.uid() = buyer_id AND is_claimed = false AND has_been_edited = false
) WITH CHECK (
  auth.uid() = buyer_id AND is_claimed = false
);

-- O comprador edita só os dados do convidado, uma única vez.
CREATE OR REPLACE FUNCTION public.protect_guest_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_end_user_request() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (NEW.id, NEW.ticket_id, NEW.buyer_id, NEW.is_claimed, NEW.claimed_by_user_id, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.ticket_id, OLD.buyer_id, OLD.is_claimed, OLD.claimed_by_user_id, OLD.created_at) THEN
    RAISE EXCEPTION 'Alteração não permitida neste convite.' USING ERRCODE = '42501';
  END IF;

  NEW.has_been_edited := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_guest_protection ON public.guests;
CREATE TRIGGER enforce_guest_protection
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.protect_guest_fields();

-- =========================================================
-- 6. COUPONS: validação pública passa pela API
-- =========================================================
DROP POLICY IF EXISTS "Leitura geral de cupons" ON public.coupons;

-- Produtor gerencia apenas cupons vinculados a eventos próprios.
-- Cupons sem evento (valem para todos) são exclusivos do admin.
DROP POLICY IF EXISTS "Produtores gerenciam seus proprios cupons" ON public.coupons;
CREATE POLICY "Produtores gerenciam seus proprios cupons" ON public.coupons
FOR ALL
TO authenticated
USING (
  public.get_user_role() = 'producer'
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = coupons.event_id AND e.producer_id = auth.uid())
)
WITH CHECK (
  public.get_user_role() = 'producer'
  AND producer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = coupons.event_id AND e.producer_id = auth.uid())
);

-- Comprador e convidado veem o cupom aplicado ao próprio ingresso.
DROP POLICY IF EXISTS "Cupons - Leitura pelo comprador" ON public.coupons;
CREATE POLICY "Cupons - Leitura pelo comprador" ON public.coupons
FOR SELECT
TO authenticated
USING (public.can_read_coupon(id));

COMMIT;
