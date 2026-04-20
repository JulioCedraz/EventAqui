-- ====================================================
-- POLÍTICAS PARA AS TABELAS PROFILES, EVENTS E TICKETS
-- ====================================================

-- ==========================================
-- POLÍTICAS: PROFILES
-- ==========================================

CREATE POLICY "Profiles - Leitura Geral" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Profiles - Inserção automática" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles - Edição Protegida" 
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.get_user_role() = 'admin')
WITH CHECK (
  (
    public.get_user_role() != 'admin' AND 
    role::text = public.get_user_role() AND -- Impede auto-promoção
    producer_id = (SELECT producer_id FROM public.profiles WHERE id = auth.uid()) -- Impede trocar de chefe
  ) OR 
  public.get_user_role() = 'admin'
);

-- Nota: A política de DELETE foi intencionalmente omitida. API não deleta perfis.

-- ==========================================
-- POLÍTICAS: EVENTS
-- ==========================================

CREATE POLICY "Events - Leitura pública" 
ON public.events FOR SELECT USING (true);

CREATE POLICY "Events - Criação restrita" 
ON public.events FOR INSERT 
WITH CHECK (public.get_user_role() IN ('admin', 'producer'));

CREATE POLICY "Events - Edição pelo dono ou admin" 
ON public.events FOR UPDATE 
USING (auth.uid() = producer_id OR public.get_user_role() = 'admin');

CREATE POLICY "Events - Exclusão pelo dono ou admin" 
ON public.events FOR DELETE 
USING (auth.uid() = producer_id OR public.get_user_role() = 'admin');

-- ==========================================
-- POLÍTICAS: TICKETS
-- ==========================================

CREATE POLICY "Tickets - Leitura Híbrida" 
ON public.tickets FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = auth.uid()
  OR (
      public.get_user_role() = 'agent' AND
      (SELECT producer_id FROM public.profiles WHERE id = auth.uid()) = (SELECT producer_id FROM public.events WHERE id = event_id)
  )
);

CREATE POLICY "Tickets - Compra Autenticada (Inserção)" 
ON public.tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id OR public.get_user_role() IN ('admin', 'producer'));

CREATE POLICY "Tickets - Atualização (Check-in)" 
ON public.tickets FOR UPDATE 
USING (
  public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = auth.uid()
  OR (
      public.get_user_role() = 'agent' AND
      (SELECT producer_id FROM public.profiles WHERE id = auth.uid()) = (SELECT producer_id FROM public.events WHERE id = event_id)
  )
);

CREATE POLICY "Tickets - Exclusão" 
ON public.tickets FOR DELETE 
USING (
  public.get_user_role() = 'admin'
  OR (SELECT producer_id FROM public.events WHERE id = event_id) = auth.uid()
);

-- ==========================================
-- ATIVAÇÃO FINAL
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;