-- ==========================================
-- STORAGE - BUCKET 'COVERS' POLICIES
-- ==========================================

CREATE POLICY "Capas - Inserção (Admin/Produtor)" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'covers' AND 
  public.get_user_role() IN ('admin', 'producer')
);

CREATE POLICY "Capas - Atualização (Admin/Dono)" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'covers' AND 
  (
    public.get_user_role() = 'admin' OR 
    (public.get_user_role() = 'producer' AND owner = auth.uid())
  )
);

CREATE POLICY "Capas - Exclusão (Admin/Dono)" 
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'covers' AND 
  (
    public.get_user_role() = 'admin' OR 
    (public.get_user_role() = 'producer' AND owner = auth.uid())
  )
);