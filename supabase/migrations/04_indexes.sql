-- ==================================================
-- OTIMIZAÇÃO DE PERFORMANCE: ÍNDICES DE FKs E BUSCAS
-- ==================================================

-- Índice para buscar rapidamente os eventos de um produtor
CREATE INDEX IF NOT EXISTS idx_events_producer_id ON public.events(producer_id);

-- Índice para buscar rapidamente os agentes vinculados a um produtor
CREATE INDEX IF NOT EXISTS idx_profiles_producer_id ON public.profiles(producer_id);

-- Índice para buscar rapidamente todos os ingressos de um evento específico
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);

-- Índice para buscar rapidamente todos os ingressos comprados por um usuário
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);

-- Índice otimizado para o Ceifador (LGPD Soft Delete) e Paredes de Vidro
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_queue ON public.profiles(deletion_scheduled_at) WHERE status = 'pending_deletion';