# 🎟️ EventAqui - Plataforma de Gestão e Venda de Ingressos

O **EventAqui** é um sistema web completo e responsivo desenhado para promover criação e divulgação de eventos, venda de ingressos com aprovação instantânea via PIX e a gestão de portaria através de leitura de QR Code.

**Demo:** [eventaqui.vercel.app](https://eventaqui.vercel.app/como-funciona)

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-00B1EA?style=for-the-badge&logo=mercado-pago&logoColor=white)

[![CI](https://github.com/JulioCedraz/eventaqui/actions/workflows/ci.yml/badge.svg)](https://github.com/JulioCedraz/eventaqui/actions/workflows/ci.yml)

## ✨ Principais Funcionalidades

### Para o Usuário (Cliente)
* **Vitrine de Eventos:** Exploração de eventos em um grid responsivo e moderno.
* **Autenticação Segura:** Criação de conta com confirmação de e-mail e login protegido.
* **Checkout Rápido:** Compra de ingressos com pagamento via **PIX** (QR Code e Copia e Cola), cupons de desconto e ingresso "casadinha" com convite por e-mail para o acompanhante.
* **Meus Ingressos:** Painel para visualizar ingressos comprados, com QR Code de entrada em visual de "bilhete" e status de pagamento atualizado automaticamente.

### Para o Produtor de Eventos
* **Hub Administrativo:** Dashboard centralizado com atalhos rápidos e interface fluida.
* **Recebimentos Diretos (Conta Bancária):** Conexão OAuth 2.0 segura com o Mercado Pago. O produtor vincula a própria conta para receber o valor das vendas instantaneamente via PIX.
* **Dashboard de Vendas:** KPIs de receita bruta, ingressos vendidos e valores aguardando PIX, com filtros por evento, status e cupom.
* **Gestão de Eventos e Cupons:** Criação e edição de eventos com upload de capa, limite de vagas e cupons por evento.
* **Gestão de Equipe (Agentes):** Recrutamento de agentes de portaria com convite por e-mail. O agente usa o leitor de QR Code integrado para validar os ingressos na entrada e evitar fraudes e duplicidades.

### Engine e Integrações
* **Recebimento Direto via Mercado Pago:** Pagamentos criados pela API do Mercado Pago (Checkout Transparente) com a conta conectada do produtor, que recebe o valor das vendas diretamente. A cobrança de taxa da plataforma está desativada nesta fase de validação.
* **Regras de Preço:** Eventos são gratuitos ou têm valor mínimo de R$ 1,00. O valor cobrado é sempre recalculado no servidor, incluindo cupons e vagas disponíveis.
* **Onboarding de Convidados:** Usuários convidados recebem um link mágico por e-mail e são levados à conclusão do perfil e à definição de senha.
* **Agentes Compartilhados entre Produtores:** O agente de portaria cria a conta uma única vez. Qualquer produtor pode adicioná-lo à própria equipe pelo e-mail, e o acesso aos eventos daquele produtor é liberado sem novo cadastro.
* **Baixa Automática (Webhook):** O webhook consulta o pagamento direto no Mercado Pago e só aprova o ingresso se o PIX for o gerado para aquele pedido, na conta do dono do evento.
* **Pedidos Vencidos:** Um job do `pg_cron` cancela pedidos pendentes vencidos. Pagamento que chega depois do prazo só vira ingresso se ainda houver vaga; senão, o produtor recebe um e-mail para estornar.

### Segurança e Conformidade (LGPD)
* **Step-Up Authentication:** A exclusão de conta exige a senha, conferida no servidor, e um código de 6 dígitos enviado por e-mail.
* **Exclusão com Carência:** A conta fica 30 dias em carência. Quem voltar nesse período pode reativá-la com um clique. Depois disso, um job do `pg_cron` cancela ingressos futuros, anonimiza o histórico e apaga a conta.
* **Travas de Exclusão:** Clientes com ingressos futuros precisam confirmar o abandono deles, e produtores com eventos em andamento são bloqueados.

---

## 🔒 Segurança

O projeto passou por uma auditoria de segurança. Os princípios aplicados:

* **Nada que vem do cliente é confiável:** preço, desconto, status de pagamento, papel do usuário e dono do recurso são sempre recalculados ou buscados no servidor.
* **Row Level Security em todas as tabelas:** cada policy de escrita tem `WITH CHECK`, e nenhuma tabela com CPF, e-mail ou telefone tem leitura pública.
* **Campos sensíveis protegidos por triggers:** o próprio usuário não consegue alterar papel, status, tokens do Mercado Pago nem o status de pagamento dos ingressos.
* **Papel do usuário com uma única fonte:** `profiles.role`, lido pela RLS, pelas rotas da API e pelas telas. Nunca `user_metadata`, que o usuário edita.
* **Rotas da API:** toda rota autentica o usuário, confere se ele é dono do recurso e valida o body com `zod`. Erros internos nunca são devolvidos ao cliente.
* **OAuth com `state` assinado:** o `state` do Mercado Pago fica ligado ao usuário que iniciou a conexão, por um cookie com HMAC.
* **E-mails:** todo dado do usuário inserido no HTML é escapado.
* **Segredos:** nenhum segredo usa o prefixo `NEXT_PUBLIC_`, e o histórico do repositório foi varrido com o gitleaks.

---

## 🏗️ Arquitetura

```mermaid
flowchart LR
    B[Navegador] -->|Supabase JS + RLS| SB[(Supabase<br/>Postgres, Auth, Storage)]
    B -->|fetch + token| API[Next.js<br/>Route Handlers]
    API -->|service role| SB
    API -->|PIX com o token do produtor| MP[Mercado Pago]
    MP -->|webhook| API
    API -->|Nodemailer| M[Gmail SMTP]
    CRON[pg_cron] --> SB
```

* **Leituras simples** vão direto do navegador ao Supabase, protegidas pela RLS.
* **Regras de negócio** (pagamento, cupons, convites, exclusão de conta) ficam nas rotas de `src/app/api`, que usam a service role.
* **Rotinas agendadas** rodam no próprio banco com `pg_cron`.

---

## 🧪 Qualidade

* **133 testes** com [Vitest](https://vitest.dev/), cobrindo regras de negócio e as rotas da API com um Supabase falso em memória.
* **CI no GitHub Actions** em todo PR: typecheck, lint, testes e build.
* **TypeScript estrito**, com os tipos do banco gerados pelo Supabase.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend & Backend (Fullstack):** [Next.js](https://nextjs.org/) (App Router & Route Handlers)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Interface e Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
* **Ícones e Feedbacks:** [Lucide React](https://lucide.dev/) e [Sonner](https://sonner.emilkowal.ski/)
* **BaaS (Banco de Dados, Auth, Storage e Cron):** [Supabase](https://supabase.com/)
* **Gateway de Pagamento:** [API do Mercado Pago](https://www.mercadopago.com.br/developers) (OAuth 2.0)
* **E-mails:** [Nodemailer](https://nodemailer.com/)
* **Validação e Testes:** [Zod](https://zod.dev/) e [Vitest](https://vitest.dev/)

---

## 🚀 Rodando Localmente

**Pré-requisitos:** Node.js 24, um projeto no [Supabase](https://supabase.com/), uma aplicação no [painel de desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers) e uma conta Gmail com senha de app.

1. Instale as dependências:
   ```bash
   npm install
   ```
2. No SQL Editor do Supabase, rode `supabase/migrations/00_schema_base.sql`. Ele cria todo o banco: tabelas, RLS, triggers, storage e jobs do `pg_cron`.
3. Crie o `.env.local` com as variáveis abaixo.
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role, usada só no servidor |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site, usada nos links de e-mail e no OAuth |
| `NEXT_PUBLIC_MP_APP_ID` | ID da aplicação no Mercado Pago |
| `MP_CLIENT_SECRET` | Client secret da aplicação no Mercado Pago |
| `GMAIL_USER` | Conta Gmail que envia os e-mails |
| `GMAIL_PASS` | Senha de app dessa conta |
| `CRON_SECRET` | Segredo que a Vercel envia ao chamar `/api/keepalive`, o ping diário que evita a pausa do Supabase por inatividade |

**Scripts:** `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. Para regenerar os tipos do banco, troque o `--project-id` do script `db:types` pelo do seu projeto e rode `npm run db:types`.

Para tornar um usuário administrador, rode no SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
```

---

## ⚖️ Licença e Direitos Autorais

O código está aberto para leitura e avaliação, somente.
**Todos os direitos reservados © 2026 EventAqui.**

É proibida a cópia, distribuição, modificação ou uso comercial de qualquer parte deste código-fonte sem a permissão explícita e por escrito do criador. Veja o arquivo [LICENSE](LICENSE).
