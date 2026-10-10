-- =========================================================
-- 04 - SINCRONIZA O SCHEMA COM PRODUÇÃO
-- Alinha banco novo e produção ao mesmo estado.
-- Idempotente: pode ser executada mais de uma vez.
-- =========================================================

BEGIN;

-- Credenciais OAuth do Mercado Pago (gravadas pelo callback via service role)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_access_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_refresh_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_user_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_public_key text;

-- Em produção full_name é coluna comum; na migration 00 era gerada.
ALTER TABLE public.profiles ALTER COLUMN full_name DROP EXPRESSION IF EXISTS;

-- Produção apontava estas FKs para auth.users; claimed_by_user_id sem
-- ON DELETE bloqueava a exclusão de quem resgatou um convite.
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_buyer_id_fkey;
ALTER TABLE public.guests ADD CONSTRAINT guests_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_claimed_by_user_id_fkey;
ALTER TABLE public.guests ADD CONSTRAINT guests_claimed_by_user_id_fkey
  FOREIGN KEY (claimed_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice previsto na migration 00 que não existia em produção.
CREATE INDEX IF NOT EXISTS idx_guests_ticket_id ON public.guests(ticket_id);

-- Bucket das capas de eventos (a migration 03 só criava as políticas).
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
