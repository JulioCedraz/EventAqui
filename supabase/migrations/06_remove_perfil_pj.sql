-- =========================================================
-- 06 - REMOVE O PERFIL PESSOA JURÍDICA (PJ)
-- Pré-requisito: código sem PJ já em produção.
-- Aborta sem alterar nada se algum perfil tiver dados de PJ.
-- =========================================================

BEGIN;

DO $$
DECLARE
  v_has_pj boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cnpj'
  ) THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE profile_type = ''PJ''
               OR cnpj IS NOT NULL OR company_name IS NOT NULL OR trading_name IS NOT NULL)'
      INTO v_has_pj;

    IF v_has_pj THEN
      RAISE EXCEPTION 'Existem perfis com dados de PJ. Revise-os antes de remover as colunas.';
    END IF;
  END IF;
END;
$$;

-- Cadastro sem os campos de PJ
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Remove também a constraint de profile_type e o índice único de cnpj
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS profile_type,
  DROP COLUMN IF EXISTS cnpj,
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS trading_name;

COMMIT;
