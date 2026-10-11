-- =========================================================
-- 00 - SCHEMA BASE DO EVENTAQUI
-- Estado completo do banco para um projeto Supabase novo.
-- Mudanças futuras entram em novas migrations numeradas.
-- =========================================================

BEGIN;

-- =========================================================
-- 1. TABELAS
-- =========================================================

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text,
    last_name text,
    full_name text,
    cpf text,
    birth_date date,
    phone text,
    university text,
    course text,
    semester text,
    enrollment_number text,
    role text CHECK (role IN ('admin', 'producer', 'agent', 'customer')),
    producer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text DEFAULT 'active',
    deletion_scheduled_at timestamp with time zone,
    mp_access_token text,
    mp_refresh_token text,
    mp_user_id text,
    mp_public_key text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone,
    price numeric(10, 2) NOT NULL DEFAULT 0.00,
    total_spots integer DEFAULT 0,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    producer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    discount_type text CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value numeric(10, 2) NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_casadinha_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE (code, event_id)
);

CREATE TABLE public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
    buyer_name text NOT NULL,
    buyer_email text NOT NULL,
    payment_status text,
    is_used boolean DEFAULT false,
    quantity integer NOT NULL DEFAULT 1,
    pix_qr_code text,
    pix_qr_code_base64 text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.guests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    guest_cpf text NOT NULL,
    guest_phone text,
    is_claimed boolean DEFAULT false,
    has_been_edited boolean DEFAULT false,
    claimed_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_profiles_producer_id ON public.profiles(producer_id);
CREATE INDEX idx_profiles_deletion_queue ON public.profiles(deletion_scheduled_at) WHERE status = 'pending_deletion';
CREATE INDEX idx_events_producer_id ON public.events(producer_id);
CREATE INDEX idx_coupons_event_id ON public.coupons(event_id);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_guests_ticket_id ON public.guests(ticket_id);

-- =========================================================
-- 2. FUNÇÕES DE AUTORIZAÇÃO
-- =========================================================

CREATE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(public.get_user_role(), '') = 'admin';
$$;

-- Verdadeiro quando a requisição vem do app (anon key + JWT do usuário).
-- Service role, SQL Editor e o próprio Auth retornam falso.
CREATE FUNCTION public.is_end_user_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') IN ('authenticated', 'anon');
$$;

-- Admin, produtor dono do evento ou agente contratado por ele.
CREATE FUNCTION public.is_ticket_manager(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_role text;
  v_user_producer_id uuid;
  v_event_producer_id uuid;
BEGIN
  SELECT role, producer_id INTO v_user_role, v_user_producer_id FROM public.profiles WHERE id = auth.uid();

  IF v_user_role = 'admin' THEN RETURN true; END IF;

  SELECT producer_id INTO v_event_producer_id FROM public.events WHERE id = p_event_id;

  IF v_user_role = 'producer' AND v_event_producer_id = auth.uid() THEN RETURN true; END IF;
  IF v_user_role = 'agent' AND v_user_producer_id = v_event_producer_id THEN RETURN true; END IF;

  RETURN false;
END;
$$;

-- SECURITY DEFINER evita recursão entre as políticas de tickets, guests e coupons.
CREATE FUNCTION public.is_guest_claimer(p_ticket_id uuid)
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

CREATE FUNCTION public.can_manage_ticket(p_ticket_id uuid)
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

CREATE FUNCTION public.can_read_coupon(p_coupon_id uuid)
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
CREATE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.coupons SET used_count = coalesce(used_count, 0) + 1 WHERE id = p_coupon_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO service_role;

-- =========================================================
-- 3. TRIGGERS
-- =========================================================

-- Todo usuário nasce 'customer'. Papéis são atribuídos pelo servidor.
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, cpf, phone, role, producer_id,
    birth_date, university, course, semester, enrollment_number, created_at
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
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pelo app, o usuário não altera papel, status, e-mail nem tokens do Mercado Pago.
CREATE FUNCTION public.protect_sensitive_profile_fields()
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

CREATE TRIGGER enforce_profile_protection
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Pelo app, só muda: is_used (gestor do evento) e pending -> cancelled.
CREATE FUNCTION public.protect_ticket_fields()
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

CREATE TRIGGER enforce_ticket_protection
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.protect_ticket_fields();

-- O comprador edita só os dados do convidado, uma única vez.
CREATE FUNCTION public.protect_guest_fields()
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

CREATE TRIGGER enforce_guest_protection
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.protect_guest_fields();

-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- PROFILES: o perfil é criado pelo trigger de cadastro
CREATE POLICY "Profiles - Leitura" ON public.profiles FOR SELECT USING (
  id = auth.uid() OR producer_id = auth.uid() OR public.get_user_role() = 'admin'
);

CREATE POLICY "Profiles - Inserção" ON public.profiles FOR INSERT WITH CHECK (
  public.is_admin()
);

CREATE POLICY "Profiles - Atualização" ON public.profiles FOR UPDATE USING (
  id = auth.uid() OR public.is_admin()
) WITH CHECK (
  id = auth.uid() OR public.is_admin()
);

CREATE POLICY "Profiles - Exclusão" ON public.profiles FOR DELETE USING (
  public.get_user_role() = 'admin'
);

-- EVENTS
CREATE POLICY "Events - Leitura" ON public.events FOR SELECT USING (true);

CREATE POLICY "Events - Inserção" ON public.events FOR INSERT WITH CHECK (
  public.is_admin() OR (public.get_user_role() = 'producer' AND producer_id = auth.uid())
);

CREATE POLICY "Events - Atualização" ON public.events FOR UPDATE USING (
  public.is_admin() OR producer_id = auth.uid()
) WITH CHECK (
  public.is_admin() OR producer_id = auth.uid()
);

CREATE POLICY "Events - Exclusão" ON public.events FOR DELETE USING (
  public.get_user_role() = 'admin' OR producer_id = auth.uid()
);

-- COUPONS: todo cupom pertence a um evento; a validação pública passa pela API.
CREATE POLICY "Admins podem tudo nos cupons" ON public.coupons
FOR ALL
TO authenticated
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

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

CREATE POLICY "Cupons - Leitura pelo comprador" ON public.coupons
FOR SELECT
TO authenticated
USING (public.can_read_coupon(id));

-- TICKETS: criação e aprovação apenas pelo servidor
CREATE POLICY "Tickets - Leitura" ON public.tickets FOR SELECT USING (
  user_id = auth.uid()
  OR buyer_email = (auth.jwt()->>'email')
  OR public.is_ticket_manager(event_id)
  OR public.is_guest_claimer(id)
);

CREATE POLICY "Tickets - Atualização" ON public.tickets FOR UPDATE USING (
  public.is_ticket_manager(event_id)
) WITH CHECK (
  public.is_ticket_manager(event_id)
);

-- Comprador cancela, exclui e edita convidado só pela API (/api/tickets, /api/guests), que valida os dados.
CREATE POLICY "Tickets - Exclusão" ON public.tickets FOR DELETE USING (
  public.get_user_role() = 'admin' OR event_id IN (SELECT id FROM public.events WHERE producer_id = auth.uid())
);

-- GUESTS: dados pessoais visíveis só para os envolvidos
CREATE POLICY "Guests - Leitura" ON public.guests FOR SELECT USING (
  buyer_id = auth.uid()
  OR claimed_by_user_id = auth.uid()
  OR public.can_manage_ticket(ticket_id)
);

-- =========================================================
-- 5. STORAGE (capas dos eventos)
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Capas - Inserção (Admin/Produtor)" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'covers' AND public.get_user_role() IN ('admin', 'producer')
);

CREATE POLICY "Capas - Atualização (Admin/Dono)" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'covers' AND (public.get_user_role() = 'admin' OR (public.get_user_role() = 'producer' AND owner = auth.uid()))
);

CREATE POLICY "Capas - Exclusão (Admin/Dono)" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'covers' AND (public.get_user_role() = 'admin' OR (public.get_user_role() = 'producer' AND owner = auth.uid()))
);

-- =========================================================
-- 6. CRON: remove contas não confirmadas após 21 horas
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-unconfirmed-users',
  '0 3 * * *',
  $$
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '21 hours';
  $$
);

COMMIT;
