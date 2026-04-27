-- ==========================================
-- STORAGE - BUCKET 'COVERS' POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Capas - Inserção (Admin/Produtor)" ON storage.objects;
CREATE POLICY "Capas - Inserção (Admin/Produtor)" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'covers' AND public.get_user_role() IN ('admin', 'producer')
);
DROP POLICY IF EXISTS "Capas - Atualização (Admin/Dono)" ON storage.objects;
CREATE POLICY "Capas - Atualização (Admin/Dono)" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'covers' AND (public.get_user_role() = 'admin' OR (public.get_user_role() = 'producer' AND owner = auth.uid()))
);
DROP POLICY IF EXISTS "Capas - Exclusão (Admin/Dono)" ON storage.objects;
CREATE POLICY "Capas - Exclusão (Admin/Dono)" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'covers' AND (public.get_user_role() = 'admin' OR (public.get_user_role() = 'producer' AND owner = auth.uid()))
);

-- ==========================================
-- CRON JOBS (Robôs de Automação)
-- ==========================================
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