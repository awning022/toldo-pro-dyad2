# IA própria do Toldo Pro (sem Gemini)

Este serviço executa um modelo aberto localmente com Ollama e expõe apenas um gateway autenticado. O Supabase continua sendo responsável pela sessão, empresa, permissões e filtragem dos registros. O gateway não recebe credenciais do Supabase nem consulta o banco de dados.

## Requisitos recomendados

- Servidor Linux x86-64 com Docker Engine e Docker Compose.
- Mínimo prático para o modelo `qwen2.5:3b`: 4 GB de RAM; recomendado 8 GB ou mais para o sistema e inferência.
- CPU compatível. Sem GPU a geração pode ser lenta; GPU compatível com Ollama melhora o desempenho.
- Armazenamento livre para a imagem e o modelo (reserve pelo menos 5–8 GB).
- Um domínio com HTTPS para que a Edge Function possa acessar o gateway publicamente.

## Instalação

1. Copie esta pasta para o servidor Linux.
2. Crie o arquivo de configuração:
   ```sh
   cp .env.example .env
   openssl rand -hex 32
   ```
3. Edite `.env` e substitua `AI_SERVER_TOKEN` pelo valor aleatório gerado. Nunca publique esse valor no GitHub nem no frontend.
4. Inicie os serviços:
   ```sh
   docker compose up -d --build
   docker compose logs -f ai-gateway
   ```
   O primeiro início baixa o modelo e pode demorar.
5. Configure um proxy HTTPS, como Caddy, para encaminhar seu domínio para `127.0.0.1:8080`. O exemplo está em `Caddyfile.example`. Não exponha a porta do Ollama (11434) à internet.
6. No Supabase, configure os secrets da Edge Function `assistente-ia`:
   - `AI_SERVER_URL=https://ia.seudominio.com` (sem barra no final)
   - `AI_SERVER_TOKEN=` o mesmo segredo longo do arquivo `.env`
7. Teste o endereço `https://ia.seudominio.com/healthz`; ele deve responder com `{"ok":true,...}`. Depois teste a conversa dentro do Toldo Pro.

## Segurança e limites

- A rota de chat exige Bearer token e rejeita requisições sem o segredo correto.
- O gateway não é público para uso anônimo; mantenha-o atrás de HTTPS e configure firewall/rate limit no proxy.
- A Edge Function mantém `verify_jwt=true`, valida o usuário Supabase, confirma associação à empresa e verifica as permissões antes de enviar apenas os dados autorizados ao modelo.
- A IA não grava dados no sistema nesta implementação; não anuncie mutações como concluídas.
- O modelo não foi treinado do zero: é um modelo aberto executado em infraestrutura sob seu controle.
- A URL pública e os secrets do servidor ainda precisam ser configurados por quem controla o VPS/domínio. Não coloque tokens no código-fonte.
