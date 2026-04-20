-- ==========================================
-- STORAGE - BUCKET 'COVERS' POLICIES
-- ==========================================

-- 1. LEITURA PÚBLICA - Vitrine do site: qualquer um pode ver a imagem do evento
CREATE POLICY "Capas - Leitura Pública" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'covers');

-- 2. INSERÇÃO - Apenas Admin e Produtor com crachá válido podem fazer upload
CREATE POLICY "Capas - Inserção (Admin/Produtor)" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'covers' AND 
  public.get_user_role() IN ('admin', 'producer')
);

-- 3. ATUALIZAÇÃO - Admin altera qualquer imagem. Produtor SÓ altera a imagem que ele mesmo subiu
CREATE POLICY "Capas - Atualização (Admin/Dono)" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'covers' AND 
  (
    public.get_user_role() = 'admin' OR 
    (public.get_user_role() = 'producer' AND owner = auth.uid())
  )
);

-- 4. EXCLUSÃO (Admin apaga qualquer imagem. Produtor SÓ apaga a imagem que ele mesmo subiu)
CREATE POLICY "Capas - Exclusão (Admin/Dono)" 
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'covers' AND 
  (
    public.get_user_role() = 'admin' OR 
    (public.get_user_role() = 'producer' AND owner = auth.uid())
  )
);