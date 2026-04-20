-- Ativa a extensão de agendamento no banco
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cria o robô da faxina
SELECT cron.schedule(
  'cleanup-unconfirmed-users', -- Nome da tarefa
  '0 3 * * *',                 -- Expressão Cron, todo dia às 03:00h
  $$
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '21 hours';
  $$
);