-- ====================================================
-- POLÍTICAS PARA AS TABELAS PROFILES, EVENTS E TICKETS
-- ====================================================

-- ==========================================
-- TABELA PROFILES
-- ==========================================
DROP POLICY IF EXISTS "Profiles - Leitura Segura" ON public.profiles;
CREATE POLICY "Profiles - Leitura Segura" ON public.profiles FOR SELECT USING (
  (select auth.uid()) = id 
  OR public.get_user_role() = 'admin'
  OR (public.get_user_role() = 'producer' AND producer_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Profiles - Inserção automática" ON public.profiles;
CREATE POLICY "Profiles - Inserção automática" ON public.profiles FOR INSERT WITH CHECK (
  (select auth.uid()) = id
);

DROP POLICY IF EXISTS "Profiles - Edição Protegida" ON public.profiles;
CREATE POLICY "Profiles - Edição Protegida" ON public.profiles FOR UPDATE USING (
  (select auth.uid()) = id OR public.get_user_role() = 'admin'
) WITH CHECK (
  (
    (select auth.uid()) = id AND 
    public.get_user_role() != 'admin' AND 
    role::text = public.get_user_role() AND 
    producer_id = (SELECT p.producer_id FROM public.profiles p WHERE p.id = (select auth.uid()))
  ) OR 
  public.get_user_role() = 'admin'
);


-- ==========================================
-- TABELA EVENTS
-- ==========================================
DROP POLICY IF EXISTS "Events - Edição pelo dono ou admin" ON public.events;
CREATE POLICY "Events - Edição pelo dono ou admin" ON public.events FOR UPDATE USING (
  (select auth.uid()) = producer_id OR public.get_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Events - Exclusão pelo dono ou admin" ON public.events;
CREATE POLICY "Events - Exclusão pelo dono ou admin" ON public.events FOR DELETE USING (
  (select auth.uid()) = producer_id OR public.get_user_role() = 'admin'
);


-- ==========================================
-- TABELA TICKETS
-- ==========================================
DROP POLICY IF EXISTS "Tickets - Leitura Híbrida" ON public.tickets;
CREATE POLICY "Tickets - Leitura Híbrida" ON public.tickets FOR SELECT USING (
  user_id = (select auth.uid()) 
  OR public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = (select auth.uid())
  OR (
      public.get_user_role() = 'agent' AND
      (SELECT producer_id FROM public.profiles WHERE id = (select auth.uid())) = (SELECT producer_id FROM public.events WHERE id = event_id)
  )
);

DROP POLICY IF EXISTS "Tickets - Compra Autenticada (Inserção)" ON public.tickets;
CREATE POLICY "Tickets - Compra Autenticada (Inserção)" ON public.tickets FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id OR public.get_user_role() IN ('admin', 'producer')
);

DROP POLICY IF EXISTS "Tickets - Atualização (Check-in)" ON public.tickets;
CREATE POLICY "Tickets - Atualização (Check-in)" ON public.tickets FOR UPDATE USING (
  public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = (select auth.uid())
  OR (
      public.get_user_role() = 'agent' AND
      (SELECT producer_id FROM public.profiles WHERE id = (select auth.uid())) = (SELECT producer_id FROM public.events WHERE id = event_id)
  )
);

DROP POLICY IF EXISTS "Tickets - Exclusão" ON public.tickets;
CREATE POLICY "Tickets - Exclusão" ON public.tickets FOR DELETE USING (
  public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = (select auth.uid())
);


-- ==========================================
-- ATIVAÇÃO FINAL
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;