# 🎟️ EventAqui - Plataforma de Gestão e Venda de Ingressos

O **EventAqui** é um sistema web completo e responsivo desenhado para facilitar a criação de eventos, a venda de ingressos com aprovação instantânea via PIX e a gestão de portaria através de leitura de QR Code.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-00B1EA?style=for-the-badge&logo=mercado-pago&logoColor=white)

## ✨ Principais Funcionalidades

### 👤 Para o Usuário (Cliente)
* **Vitrine de Eventos:** Exploração de eventos em um grid responsivo e moderno.
* **Autenticação Segura:** Criação de conta e login protegido.
* **Checkout Rápido:** Compra de ingressos com pagamento via **PIX** (QR Code e Copia e Cola).
* **Meus Ingressos:** Painel exclusivo e redesenhado para visualizar ingressos comprados, com QR Code de entrada com visual de "bilhete" e status de pagamento em tempo real.

### ⚙️ Para o Produtor (Admin)
* **Hub Administrativo:** Dashboard centralizado com atalhos rápidos e interface fluida para as principais ferramentas de gestão.
* **Dashboard de Vendas:** Acompanhamento financeiro avançado com KPIs de receita bruta, quantidade de ingressos vendidos e valores aguardando PIX, além de filtros dinâmicos por evento e tabela responsiva de transações.
* **Gestão de Eventos (CRUD):** Áreas isoladas e dedicadas para listagem, criação e edição de eventos, com suporte a upload de imagens de capa.
* **Baixa Automática (Webhook):** Comunicação direta com o Mercado Pago para aprovar ingressos automaticamente assim que o PIX é pago.
* **Modo Portaria:** Leitor de QR Code integrado para validar ingressos na porta do evento e evitar fraudes/duplicidades.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend & Backend (Fullstack):** [Next.js](https://nextjs.org/) (App Router)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Interface e Estilização:** [Tailwind CSS](https://tailwindcss.com/) + **[shadcn/ui](https://ui.shadcn.com/)** (Componentes de UI acessíveis e customizáveis)
* **Ícones e Feedbacks:** [Lucide React](https://lucide.dev/) (Ícones) e [Sonner](https://sonner.emilkowal.ski/) (Toasts de notificação)
* **BaaS (Banco de Dados, Auth e Storage):** [Supabase](https://supabase.com/)
* **Gateway de Pagamento:** [API do Mercado Pago](https://www.mercadopago.com.br/developers)

---

## 🚀 Como rodar o projeto localmente

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (Versão 18+ recomendada)
* Conta no [Supabase](https://supabase.com/)
* Conta de desenvolvedor no [Mercado Pago](https://www.mercadopago.com.br/developers)

### 2. Clonar o repositório
```bash
git clone [https://github.com/juliocedraz/eventaqui.git](https://github.com/juliocedraz/eventaqui.git)
cd eventaqui