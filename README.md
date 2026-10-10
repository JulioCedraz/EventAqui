# 🎟️ EventAqui - Plataforma de Gestão e Venda de Ingressos

O **EventAqui** é um sistema web completo e responsivo desenhado para promover criação e divulgação de eventos, venda de ingressos com aprovação instantânea via PIX e a gestão de portaria através de leitura de QR Code.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-00B1EA?style=for-the-badge&logo=mercado-pago&logoColor=white)

## ✨ Principais Funcionalidades

### Para o Usuário (Cliente)
* **Vitrine de Eventos:** Exploração de eventos em um grid responsivo e moderno.
* **Autenticação Segura:** Criação de conta e login protegido.
* **Checkout Rápido:** Compra de ingressos com pagamento via **PIX** (QR Code e Copia e Cola).
* **Meus Ingressos:** Painel exclusivo e redesenhado para visualizar ingressos comprados, com QR Code de entrada com visual de "bilhete" e status de pagamento em tempo real.

### Para o Produtor de Eventos
* **Hub Administrativo:** Dashboard centralizado com atalhos rápidos e interface fluida.
* **Recebimentos Diretos (Conta Bancária):** Conexão OAuth 2.0 segura com o Mercado Pago. O produtor vincula a própria conta para receber o valor das vendas instantaneamente via PIX.
* **Dashboard de Vendas:** Acompanhamento financeiro avançado com KPIs de receita bruta, quantidade de ingressos vendidos e valores aguardando PIX, além de filtros dinâmicos por evento e tabela responsiva de transações.
* **Gestão de Eventos (CRUD):** Áreas isoladas e dedicadas para listagem, criação e edição de eventos, com suporte a upload de imagens de capa.
* **Gestão de Equipe (Agentes):** Recrutamento de agentes de portaria com disparo de e-mail integrado e gestão de acessos independente. O agente tem acesso ao leitor de QR Code integrado para validar os ingressos na entrada do evento e evitar fraudes/duplicidades.

### Engine e Integrações
* **Recebimento Direto via Mercado Pago:** Pagamentos criados pela API do Mercado Pago (Checkout Transparente) com a conta conectada do produtor, que recebe o valor das vendas diretamente. A cobrança de taxa da plataforma está desativada nesta fase de validação.
* **Regras de Preço:** Eventos são "Gratuitos" ou têm valor mínimo de R$ 1,00, bloqueando transações irrisórias no gateway. O valor cobrado é sempre recalculado no servidor, incluindo cupons e vagas disponíveis.
* **Onboarding Inteligente:** Usuários convidados recebem e-mails mágicos e são redirecionados automaticamente para a conclusão de perfil e definição de senha.
* **Sistema "Uber" de Portaria (Conta Unificada):** O produtor de eventos pode recrutar os seus próprios agentes de portaria enviando um e-mail personalizado diretamente da plataforma. A pessoa convidada cria sua conta apenas uma vez no EventAqui e já terá acesso ao leitor de QR code para validação dos ingressos vendidos pelo produtor contratante. Qualquer outro produtor pode contratá-lo simplesmente digitando seu e-mail no painel. O sistema reconhece o agente de portaria instantaneamente e faz a ponte entre eles nos bastidores, liberando o acesso aos novos eventos sem exigir que o porteiro crie outro cadastro.
* **Baixa Automática (Webhook):** Comunicação direta e validada com o Mercado Pago para aprovar ingressos automaticamente assim que o PIX é pago.
* **Segurança Avançada (RLS):** Row Level Security implementado no Supabase para garantir que produtores e agentes acessem única e exclusivamente os dados que lhes pertencem.

### Segurança e Conformidade (LGPD)
* **Step-Up Authentication:** Ações destrutivas (como exclusão de conta) exigem revalidação da senha e envio de código OTP via e-mail, prevenindo sequestro de sessão (*Session Hijacking*).
* **Retenção Inteligente (Soft Delete):** Sistema de exclusão com carência de 30 dias. Usuários arrependidos são interceptados por uma "parede de vidro" (Reactivation Guard) no próximo login, permitindo a restauração instantânea da conta com um clique.
* **Validação de Ingressos e Eventos:** Travas de segurança arquiteturais impedem que clientes deletem contas com ingressos futuros ativos sem confirmação explícita de abandono, e bloqueiam produtores com eventos em andamento.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend & Backend (Fullstack):** [Next.js](https://nextjs.org/) (App Router & API Routes)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Interface e Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Componentes de UI acessíveis e customizáveis)
* **Ícones e Feedbacks:** [Lucide React](https://lucide.dev/) (Ícones) e [Sonner](https://sonner.emilkowal.ski/) (Toasts de notificação)
* **BaaS (Banco de Dados, Auth e Storage):** [Supabase](https://supabase.com/)
* **Gateway de Pagamento:** [API do Mercado Pago](https://www.mercadopago.com.br/developers) (OAuth 2.0)

---

## ⚖️ Licença e Direitos Autorais

Este é um software proprietário de código fechado. 
**Todos os direitos reservados © 2026 EventAqui.**

É estritamente proibida a cópia, distribuição, modificação, uso comercial ou uso não autorizado de qualquer parte deste código-fonte sem a permissão explícita e por escrito do criador.