---
name: eventaqui-dev
description: >
  Procedimento de entrega e padrão de commit do EventAqui. Use ao concluir
  feature, correção de bug, refatoração ou migration neste projeto, e sempre
  que pedirem "commit", "commit message", "write a commit" ou /commit.
  Neste projeto, substitui a skill caveman-commit.
---

# EventAqui: entrega e commits

As regras de stack, segurança, escopo e banco estão no `CLAUDE.md` da raiz. Esta skill cobre o que acontece depois que a mudança está escrita.

## 1. Definição de pronto
Antes de propor qualquer commit, rode e reporte o resultado:
- `npx tsc --noEmit`
- `npm run lint`

Se algum falhar, corrija ou informe o erro. Não proponha commit com erro.

## 2. Divisão em commits
- Um commit = uma mudança lógica. Pode envolver vários arquivos (ex.: migration + rota).
- Mudanças independentes viram commits separados, cada um com seu bloco.
- Melhorias fora do escopo não entram no commit; ficam listadas como sugestão.

## 3. Formato de entrega
Não execute `git add`, `git commit` nem `git push` sem pedido explícito. Entregue o bloco pronto para o usuário rodar:

**Target Files:** `path/a.ts`, `path/b.sql`
```bash
git add path/a.ts path/b.sql
git commit -m "<type>(<scope>): <subject>

- <porquê>"
```

## 4. Conteúdo da mensagem

### Assunto
- Formato: `<type>(<scope>): <subject>`, em inglês, modo imperativo ("add", "fix", "remove"; nunca "added" ou "adds").
- Até 50 caracteres quando possível. Teto rígido de 72.
- Minúsculo após os dois-pontos, sem ponto final.
- Tipos: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Escopos do projeto: `api`, `webhook`, `checkout`, `payment`, `admin`, `auth`, `db`, `tickets`, `orders`, `coupons`, `mail`, `ui`.
- Breaking change: não use `!` no assunto (quebra o shell, ver seção 5). Sinalize só com a linha `BREAKING CHANGE:` no corpo, que também é válida no Conventional Commits.

### Corpo
- Obrigatório em: correção de segurança, migration de banco (`db`), breaking change e revert.
- Nos demais casos, só quando o porquê não é óbvio pelo assunto. Se o assunto basta, omita o corpo.
- Foco no porquê. O diff já mostra o que mudou.
- Bullets com `- `, quebra de linha em ~72 colunas, linha em branco após o assunto.
- Breaking change: incluir a linha `BREAKING CHANGE: <o que passou a se comportar diferente>`.

### Proibido na mensagem
- "This commit", "I", "we", "now", "currently".
- Repetir o nome do arquivo quando o escopo já o indica.
- Emoji.
- Instruções de deploy ou de ordem de execução (ex.: "aplique só depois do deploy"). Elas vão apenas na conversa com o usuário.

## 5. Regras de shell
A mensagem vai entre aspas duplas. Dentro dela:
- Para destacar nomes, valores ou variáveis, use aspas simples: `'buyer_email'`.
- Proibido: apóstrofo (escreva "does not", nunca "doesn't"), crase, `$` e `!`. Eles quebram o comando no Bash ou no PowerShell.

## 6. Descrição de PR e comentários no código
- Descrição de PR: em inglês e em português, descrevendo o que mudou e por quê.
- Ordem de deploy, migrations a rodar e passos manuais ficam fora do PR, dos commits e dos comentários. Vão apenas na conversa com o usuário.
- Comentários no código: só para o porquê que não é óbvio. Não comente o que o código já diz.

## Exemplos

Mudança simples, sem corpo:

**Target Files:** `src/components/EventCard.tsx`
```bash
git add src/components/EventCard.tsx
git commit -m "style(ui): align price badge on event card"
```

Correção de segurança, com corpo obrigatório:

**Target Files:** `src/app/api/payment/route.ts`
```bash
git add src/app/api/payment/route.ts
git commit -m "fix(payment): compute ticket price on the server

- Client could send 'price: 0' and get any ticket approved for free.
- Read price from 'events' and validate ticket ownership via session."
```

Migration com breaking change:

**Target Files:** `supabase/migrations/04_hardening_rls.sql`, `src/types/database.types.ts`
```bash
git add supabase/migrations/04_hardening_rls.sql src/types/database.types.ts
git commit -m "fix(db): restrict guest data to buyer and claimer

- Public read policy exposed guest CPF, email and phone to anonymous users.

BREAKING CHANGE: anonymous clients can no longer read 'guests'; the
redeem page must load guest data through an authenticated API route."
```
