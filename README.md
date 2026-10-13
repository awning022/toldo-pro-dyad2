# Toldo Pro

Sistema de gestão para empresas de toldos: clientes e CRM, contatos e vendas, orçamentos, calculadora de materiais e sobras, ordens de serviço, produção, instalações, estoque, financeiro, relatórios, agenda, notificações e gestão de equipe/permissões.

A aplicação usa React + Vite no frontend e Supabase para autenticação, banco de dados e isolamento dos dados por empresa. A versão atual não inclui assistente de IA.

## Configuração do Supabase

1. Crie um projeto Supabase e configure os modelos de e-mail e as URLs de autenticação.
2. Copie `.env.example` para `.env.local` e configure:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (chave pública/publishable do projeto).
   
   Nunca coloque uma chave `service_role` ou outro segredo em variáveis `VITE_`.
3. Aplique as migrações na ordem:
   ```sh
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
   A sequência de migrações `001` a `006` mantém o histórico e a estrutura de banco exigida pelo aplicativo.
4. Configure o segredo `APP_URL` nas Edge Functions do Supabase com a origem pública da aplicação. Publique somente a função de convite de funcionários:
   ```sh
   supabase functions deploy invite-employee
   ```
   O Supabase fornece os segredos padrão usados pela função. Não configure chave de provedor de IA para esta aplicação.
5. Para publicar o frontend, conecte o repositório a uma hospedagem compatível com Vite. Comando de build: `pnpm build`; diretório gerado: `dist`. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de build.
6. Em **Supabase → Authentication → URL Configuration**, defina a URL pública da aplicação como Site URL e permita o callback `<origem-da-aplicacao>/auth/confirm`, além das URLs locais e de preview que realmente utilizar.

## Autenticação e empresas

Administradores criam a conta e confirmam o e-mail pelo Supabase Auth. O gatilho de autenticação cria perfil, empresa e associação de administrador de forma atômica. O aplicativo usa `company_members` como tabela de associação. Convites de funcionários e alterações de permissões seguem os caminhos autorizados pelo backend. Os dados das empresas são protegidos por Row Level Security (RLS) e funções de banco.

## Desenvolvimento local

```sh
corepack pnpm install
corepack pnpm dev
``

Para validar o projeto antes de publicar:

```sh
corepack pnpm build
corepack pnpm lint
``
