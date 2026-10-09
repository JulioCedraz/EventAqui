-- =========================================================
-- 04 - SINCRONIZA O SCHEMA COM PRODUÇÃO
-- Colunas que existiam em produção mas não nas migrations 00-03.
-- Idempotente: em produção não altera nada.
-- =========================================================

-- Credenciais OAuth do Mercado Pago (gravadas pelo callback via service role)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_access_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_refresh_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_user_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_public_key text;

-- Em produção full_name é coluna comum; na migration 00 era gerada.
ALTER TABLE public.profiles ALTER COLUMN full_name DROP EXPRESSION IF EXISTS;
