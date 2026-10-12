# EventAqui

Plataforma de venda de ingressos e gestão de portaria.

## Contexto do projeto
- Stack: Next.js 16 (App Router, Route Handlers), TypeScript, Tailwind + shadcn/ui, Supabase (Postgres, Auth, RLS, Storage, pg_cron), Mercado Pago (PIX, OAuth split), Nodemailer.
- Textos de UI e comentários de código: pt-BR. Mensagens de commit: inglês.
- Rotas de API: `src/app/api/**/route.ts`. Utilitários: `src/lib`. Componentes: `src/components`.
- Tipos do banco: `src/types/database.types.ts`, gerado pelo Supabase. Não editar à mão; regenerar com `npm run db:types` após aplicar mudanças no banco.
- Para implementar mudanças e preparar commits, siga a skill `eventaqui-dev`.

## Segurança (inegociável)
- Nunca confie em valores vindos do cliente para preço, desconto, status de pagamento, role, `producer_id` ou dono de recurso. Recalcule ou busque no servidor.
- Toda rota em `src/app/api` autentica o usuário e verifica se ele é dono do recurso. Exceção: webhook, que valida a assinatura do gateway.
- Webhooks: validar assinatura e conferir valor e referência contra o banco antes de aprovar.
- Autorização nunca usa `user_metadata`, que é editável pelo próprio usuário. Use `profiles.role`, a única fonte do papel (não há cópia em `app_metadata`).
- Validar o body de toda rota com `zod`.
- Segredos nunca com prefixo `NEXT_PUBLIC_`. Nunca retornar `err.message` ao cliente.
- Dados do usuário em HTML de e-mail devem ser escapados. Rotas que enviam e-mail exigem autenticação.
- RLS: toda tabela nova com RLS ativo. Toda policy de INSERT/UPDATE com `WITH CHECK`. Nenhum `USING (true)` em tabela com dado pessoal (CPF, e-mail, telefone).

## Escopo e simplificação
- Altere só o necessário para a tarefa. Simplifique apenas o código que já está sendo tocado.
- Melhorias fora do escopo: liste ao final como sugestão, sem aplicar.
- Prefira early returns a `if/else` aninhado.
- Extraia lógica repetida na terceira ocorrência (regra de três), para `src/lib` ou hooks.
- Regra de negócio fica no backend. O frontend renderiza e cuida da UX.
- Reaproveite fluxos existentes somente se forem seguros. Se não forem, corrija o fluxo antes de reaproveitá-lo.

## Banco de dados
- `supabase/migrations/00_schema_base.sql` é a única migration: o estado completo do banco, usado para criar um projeto Supabase novo.
- Toda mudança de schema ou policy atualiza o `00_schema_base.sql`. O SQL de alteração para produção é entregue na conversa, não em arquivo novo, e o usuário aplica no SQL Editor.
- Funções `SECURITY DEFINER`: sempre definir `search_path`. Não usar `current_user` para identificar quem chama (dentro da função ele é o dono); use `auth.uid()` ou `auth.role()`.
- Papel de usuário nunca é lido de `raw_user_meta_data` em triggers de cadastro.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
