# Easy Assist - Sistema de Gestão para Assistências Tecnicas

Sistema completo de Gestão (ERP/CRM) para a Assistência Técnica. A aplicação gerencia clientes, ordens de serviço, estoque, vendas e controle financeiro.

## 🚀 Tecnologias Utilizadas

O projeto foi construído utilizando um ecossistema moderno para desenvolvimento frontend:

- **React 18** com **TypeScript**
- **Vite** como bundler e servidor de desenvolvimento
- **React Router Dom** para roteamento da aplicação (SPA)
- **Tailwind CSS** para estilização utilitária
- **shadcn/ui** e **Radix UI** para componentes de interface
- **React Query** (`@tanstack/react-query`) para gerenciamento de estado assíncrono e cache
- **Supabase** como backend como serviço (BaaS) fornecendo Autenticação e Banco de Dados
- **Lucide React** para ícones
- **React Hook Form** + **Zod** para formulários e validação

## 📂 Estrutura de Módulos

A aplicação é dividida nos seguintes módulos (rotas principais):

- `/auth`: Autenticação (Login)
- `/`: Dashboard principal
- `/clientes`: Gestão de Clientes e cadastro
- `/ordens`: Gestão de Ordens de Serviço (OS)
- `/estoque`: Controle de Inventário e Produtos
- `/vendas`: Ponto de Venda (PDV) e registro de vendas
- `/financeiro`: Controle de fluxo de caixa, receitas e despesas
- `/relatorios`: Geração de relatórios da operação
- `/configuracoes`: Ajustes de sistema e perfil
- `/saas-admin`: Painel de administração geral (SaaS)

## ⚙️ Variáveis de Ambiente

Para o sistema funcionar, é necessário configurar as variáveis de ambiente que conectam o frontend ao Supabase. 
Crie um arquivo `.env` na raiz do projeto contendo as seguintes chaves (substitua os valores com os da sua instância do Supabase):

```env
VITE_SUPABASE_PROJECT_ID="seu_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_anon_key"
VITE_SUPABASE_URL="https://seu_project_id.supabase.co"
```

## 💻 Como rodar localmente

1. Certifique-se de ter o **Node.js** instalado (versão 18+ recomendada).
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. A aplicação estará disponível em `http://localhost:8080` (conforme configuração do Vite).

## ☁️ Hospedagem / Deploy do Sistema

Por ser uma aplicação tipo **Single Page Application (SPA)** focada no frontend (com backend rodando integralmente no Supabase), a hospedagem é simples, rápida e barata.

### Opções Recomendadas de Hospedagem
As melhores plataformas para hospedar projetos React + Vite de forma gratuita ou com custo mínimo incluem:
- **Vercel** (Recomendação número 1 pela facilidade de uso com React)
- **Netlify**
- **Cloudflare Pages**

### Configurações de Build para o Deploy

Seja qual for a plataforma escolhida, você precisará informar os seguintes comandos e diretórios de build da aplicação:

- **Framework Preset**: Vite (se houver essa opção)
- **Build Command**: `npm run build` ou `npm run build:dev`
- **Output Directory (Diretório de saída)**: `dist`

### Variáveis de Ambiente na Hospedagem

No painel painel da plataforma de hospedagem escolhida (Vercel, Netlify, etc), você DEVE cadastrar as mesmas variáveis de ambiente usadas localmente para a aplicação funcionar em produção:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

### Tratamento de Rotas (Rewrite Rules)

Como a aplicação utiliza o `react-router-dom` (SPA), o provedor de nuvem precisa saber que qualquer rota (ex: `/clientes` ou `/financeiro`) deve ser redirecionada para o arquivo `index.html`, para que o React assuma o roteamento.

#### Se usar Vercel
A Vercel geralmente identifica projetos Vite automaticamente, mas caso ocorra erro 404 ao atualizar a página (F5), crie um arquivo `vercel.json` na raiz do projeto:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Se usar Netlify
Crie um arquivo chamado `_redirects` dentro da pasta `public/` com o seguinte conteúdo:
```
/* /index.html 200
```
Isso garante que todas as URLs sejam redirecionadas para o index.html sem alterar a URL exibida pro usuário.

---
**Nota sobre o Banco de Dados:** Lembre-se que todo o banco de dados e autenticação ficam hospedados e geridos pelo plano do seu projeto no **Supabase**. A hospedagem do frontend (Vercel/Netlify) apenas armazena e entrega os arquivos estáticos (HTML/CSS/JS) para o navegador do cliente.
