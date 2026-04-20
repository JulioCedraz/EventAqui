-- 1. Função que espelha os dados do Auth para o Profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    producer_id,
    created_at
  )
  VALUES (
    new.id, 
    new.email, 
    -- Extrai a role do metadado. Se não houver (cadastro comum), vira 'customer'
    COALESCE(new.raw_user_meta_data->>'role', 'customer'), 
    -- Extrai o producer_id caso seja um convite de agente
    (new.raw_user_meta_data->>'producer_id')::uuid,
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    -- Garante que se o usuário já existir, a role e o produtor sejam atualizados
    role = COALESCE(EXCLUDED.role, profiles.role),
    producer_id = COALESCE(EXCLUDED.producer_id, profiles.producer_id);

  RETURN new;
END;
$$;

-- 2. Recriando o gatilho para garantir que a nova lógica seja aplicada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();