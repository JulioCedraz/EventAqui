-- ==========================================
-- CRON JOBS (Robôs de Automação)
-- ==========================================

-- Ativa a extensão de agendamento no banco (se já não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cria o robô da faxina (Roda todo dia às 03:00 da manhã)
SELECT cron.schedule(
  'cleanup-unconfirmed-users', 
  '0 3 * * *',                 
  $$
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '21 hours';
  $$
);