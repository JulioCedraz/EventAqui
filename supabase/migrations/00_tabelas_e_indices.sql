-- =========================================================
-- RESET E CRIAÇÃO DAS TABELAS BASE
-- =========================================================
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    
    -- Campos Pessoa Física (PF)
    first_name text,
    last_name text,
    cpf text,
    birth_date date,
    phone text,
    university text,
    course text,
    semester text,
    enrollment_number text,
    
    -- Campos Pessoa Jurídica (PJ)
    profile_type text CHECK (profile_type IN ('PF', 'PJ')) DEFAULT 'PF',
    cnpj text UNIQUE,
    company_name text,
    trading_name text,

    -- Coluna Gerada Dinamicamente
    full_name text GENERATED ALWAYS AS (
        COALESCE(
            NULLIF(trading_name, ''), 
            NULLIF(company_name, ''), 
            trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        )
    ) STORED,

    -- Campos de Sistema
    role text CHECK (role IN ('admin', 'producer', 'agent', 'customer')),
    producer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text DEFAULT 'active',
    deletion_scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone,
    price numeric(10, 2) DEFAULT 0.00,
    total_spots integer DEFAULT 0,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    producer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    discount_type text CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value numeric(10, 2) NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(code, event_id)
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
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    pix_qr_code text,
    pix_qr_code_base64 text,
    expires_at timestamp with time zone
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

-- =========================================================
-- ÍNDICES DE PERFORMANCE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_events_producer_id ON public.events(producer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_producer_id ON public.profiles(producer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_queue ON public.profiles(deletion_scheduled_at) WHERE status = 'pending_deletion';
CREATE INDEX IF NOT EXISTS idx_coupons_event_id ON public.coupons(event_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_guests_ticket_id ON public.guests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_guests_buyer_id ON public.guests(buyer_id);