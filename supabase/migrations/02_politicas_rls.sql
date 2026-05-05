-- =========================================================
-- ATIVAÇÃO GERAL RLS
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Limpeza de todas as políticas antigas para evitar bugs de duplicidade
DROP POLICY IF EXISTS "Profiles - Leitura" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Inserção" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Atualização" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Exclusão" ON public.profiles;
DROP POLICY IF EXISTS "Events - Leitura" ON public.events;
DROP POLICY IF EXISTS "Events - Inserção" ON public.events;
DROP POLICY IF EXISTS "Events - Atualização" ON public.events;
DROP POLICY IF EXISTS "Events - Exclusão" ON public.events;
DROP POLICY IF EXISTS "Tickets - Leitura" ON public.tickets;
DROP POLICY IF EXISTS "Tickets - Inserção" ON public.tickets;
DROP POLICY IF EXISTS "Tickets - Atualização" ON public.tickets;
DROP POLICY IF EXISTS "Tickets - Exclusão" ON public.tickets;

-- ==========================================
-- TABELA PROFILES
-- ==========================================
CREATE POLICY "Profiles - Leitura" ON public.profiles FOR SELECT USING (
  id = auth.uid() OR producer_id = auth.uid() OR public.get_user_role() = 'admin'
);

CREATE POLICY "Profiles - Inserção" ON public.profiles FOR INSERT WITH CHECK (
  id = auth.uid() OR public.get_user_role() = 'admin'
);

CREATE POLICY "Profiles - Atualização" ON public.profiles FOR UPDATE USING (
  id = auth.uid() OR public.get_user_role() = 'admin'
);

CREATE POLICY "Profiles - Exclusão" ON public.profiles FOR DELETE USING (
  public.get_user_role() = 'admin'
);

-- ==========================================
-- TABELA EVENTS
-- ==========================================
CREATE POLICY "Events - Leitura" ON public.events FOR SELECT USING (true);

CREATE POLICY "Events - Inserção" ON public.events FOR INSERT WITH CHECK (
  public.get_user_role() IN ('admin', 'producer')
);

CREATE POLICY "Events - Atualização" ON public.events FOR UPDATE USING (
  public.get_user_role() = 'admin' OR producer_id = auth.uid()
);

CREATE POLICY "Events - Exclusão" ON public.events FOR DELETE USING (
  public.get_user_role() = 'admin' OR producer_id = auth.uid()
);

-- ==========================================
-- TABELA TICKETS
-- ==========================================
CREATE POLICY "Tickets - Leitura" ON public.tickets FOR SELECT USING (
  user_id = auth.uid() OR public.is_ticket_manager(event_id)
);

CREATE POLICY "Tickets - Inserção" ON public.tickets FOR INSERT WITH CHECK (
  user_id = auth.uid() OR public.get_user_role() IN ('admin', 'producer')
);

CREATE POLICY "Tickets - Atualização" ON public.tickets FOR UPDATE USING (
  public.is_ticket_manager(event_id)
);

CREATE POLICY "Tickets - Exclusão" ON public.tickets FOR DELETE USING (
  public.get_user_role() = 'admin' OR event_id IN (SELECT id FROM public.events WHERE producer_id = auth.uid())
);