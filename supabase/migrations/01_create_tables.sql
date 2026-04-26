-- =========================================================
-- RESETAR AS TABELAS BASE
-- =========================================================
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. TABELA PROFILES
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text,
    last_name text,
    full_name text GENERATED ALWAYS AS (trim(concat(first_name, ' ', last_name))) STORED,
    cpf text,
    occupation text,
    role text CHECK (role IN ('admin', 'producer', 'agent', 'customer')),
    producer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    birth_date date,
    university text,
    course text,
    area text,
    specialty text,
    -- Campos LGPD e Exclusão
    status text DEFAULT 'active', 
    deletion_scheduled_at timestamp with time zone, 
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA EVENTS
CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone NOT NULL,
    price numeric(10, 2) NOT NULL DEFAULT 0.00,
    total_spots integer NOT NULL DEFAULT 0,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA TICKETS
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