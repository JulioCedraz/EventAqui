-- =========================================================
-- 1. RESET E CRIAÇÃO DAS TABELAS BASE
-- =========================================================
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text,
    last_name text,
    full_name text GENERATED ALWAYS AS (trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) STORED,
    cpf text,
    occupation text,
    role text CHECK (role IN ('admin', 'producer', 'agent', 'customer')),
    producer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    birth_date date,
    university text,
    course text,
    area text,
    specialty text,
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

CREATE TABLE public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- =========================================================
-- 2. ÍNDICES DE PERFORMANCE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_events_producer_id ON public.events(producer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_producer_id ON public.profiles(producer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_queue ON public.profiles(deletion_scheduled_at) WHERE status = 'pending_deletion';