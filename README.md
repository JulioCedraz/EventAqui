# 🎟️ EventAqui - Plataforma de Gestão e Venda de Ingressos

O **EventAqui** é um sistema web completo e responsivo desenhado para facilitar a criação de eventos, a venda de ingressos com aprovação instantânea via PIX e a gestão de portaria através de leitura de QR Code.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-00B1EA?style=for-the-badge&logo=mercado-pago&logoColor=white)

## ✨ Principais Funcionalidades

### 👤 Para o Usuário (Cliente)
* **Vitrine de Eventos:** Exploração de eventos em um grid responsivo e moderno.
* **Autenticação Segura:** Criação de conta e login.
* **Checkout Rápido:** Compra de ingressos com pagamento via **PIX** (QR Code e Copia e Cola).
* **Meus Ingressos:** Painel exclusivo para visualizar ingressos comprados e o status do pagamento em tempo real.

### ⚙️ Para o Produtor (Admin)
* **Painel de Controle:** Dashboard administrativo protegido.
* **Gestão de Eventos (CRUD):** Criação, edição e exclusão de eventos com upload de imagens de capa.
* **Baixa Automática (Webhook):** O sistema se comunica com o Mercado Pago para aprovar ingressos automaticamente assim que o PIX é pago.
* **Modo Portaria:** Leitor de QR Code integrado para validar ingressos na porta do evento e evitar fraudes/duplicidades.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend & Backend (Fullstack):** [Next.js](https://nextjs.org/) (App Router)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
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