# Bruno & Zaki Garage Diecast

Objetivo Geral: Desenvolver uma aplicação web full-stack de catálogo e reserva de miniaturas colecionáveis, dividida em:

Vitrine pública com fluxo de reserva (carrinho sem checkout direto).

Painel administrativo restrito com autenticação para gestão de estoque e baixa de pedidos.

1. Fluxo de Negócio e Funcionalidades

Área Pública (Catálogo e Reserva):

Grid de miniaturas em cards responsivos com foto, título, valor (R$), quantidade e status visual de estoque ("Disponível" ou "Esgotado").

Carrinho de reservas: o cliente seleciona os itens e finaliza um "Pedido de Reserva". Não há gateway de pagamento online; a lista de itens reservados vai direto para a fila do administrador.

Área Administrativa (Gestão e Autenticação):

Rota protegida por autenticação no lado do servidor.

CRUD completo de miniaturas (upload restrito de imagem, preço, título e estoque).

Painel de reservas com ação "Marcar como Pago", executando a baixa automática no estoque correspondente.

2. Motion Principles e Experiência do Usuário (UX/UI)

Seguir estritamente os princípios de design de movimento (kylezantos/design-principles).

Implementar skeleton loading em todos os cards de produtos, tabelas e painéis antes da hidratação dos dados.

Aplicar lazy loading em todas as imagens do catálogo.

Adicionar animações fluidas (smooth transitions) de entrada, saída, carregamento, feedbacks visuais e barras de progresso em todas as interações.

3. Governança, Versionamento e Documentação

Workflow de Git: Criar issues no GitHub para absolutamente todas as tarefas (bugs, melhorias ou novas features).

Deploy via Pull Requests: Todo deploy/merge deve ser gerenciado via PR, referenciando obrigatoriamente o número da issue na descrição (ex: Closes #12).

Documentação (README.md / .md do projeto): Registrar detalhadamente essas instruções de branching, issues, PRs e padrões de arquitetura no arquivo markdown raiz para orientar qualquer agente/modelo futuro.

4. Observabilidade, Qualidade e Testes

Observabilidade: Configurar instrumentação para rastreamento de erros e métricas via Sentry, Datadog/New Relic e OpenTelemetry.

Qualidade e Linting: Configurar Biome, Commitlint, Arch-Contract, Knip e Stryker para testes de mutação.

Testes:

Cobertura de testes unitários e de integração integrados ao Codecov.

Testes end-to-end (E2E) completos via Playwright cobrindo autenticação, reserva pública e baixa de estoque no painel.

5. Checklist Rigoroso de Segurança

Ocultar todas as chaves de API em variáveis de ambiente.

Garantir a remoção completa de qualquer segredo/token do histórico do Git.

Utilizar chave pública restrita para leitura do banco de dados no frontend.

Ativar Row-Level Security (RLS) em todas as tabelas do banco de dados.

Criptografar dados sensíveis em repouso e em trânsito.

Impor autenticação estrita no lado do servidor (Server-Side Authentication).

Restringir acesso granular aos campos conforme o nível de privilégio.

Impedir adulteração de campos no payload das requisições (Data Tampering Protection).

Proteger cookies de sessão utilizando flags HttpOnly, Secure e SameSite=Strict.

Armazenar senhas exclusivamente com hashing forte (ex: bcrypt/argon2).

Implementar Rate Limiting para limitar tentativas consecutivas de login.

Adicionar proteção contra bots e scraping nas rotas públicas e de autenticação.

Utilizar consultas estritamente parametrizadas (Prepared Statements / ORM seguro).

Validar todas as entradas de dados via schemas (ex: Zod).

Escapar todo o conteúdo enviado por usuários contra XSS.

Restringir uploads de arquivos: validar estritamente extensões permitidas (.png, .jpg, .webp), MIME types e impor limites rigorosos de tamanho de arquivo.

Retornar apenas os dados estritamente necessários nas respostas da API (Data Minimization).

Configurar cabeçalhos de segurança HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).

Forçar redirecionamento e uso exclusivo de HTTPS.

Configurar varreduras automáticas de vulnerabilidade em dependências (ex: npm audit, Dependabot, Snyk).

6. Regra Estrita de Geração de Código

NUNCA adicione comentários explicativos dentro de blocos de código (JavaScript, TypeScript, Python, HTML, CSS, SQL, etc.). Entregue o código totalmente limpo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bruno-e-zaki.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fbf95a8-6efc-48ce-adf9-fb658425b85f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Configuração do Firebase

Este projeto foi migrado de Supabase para Firebase. Certifique-se de configurar seu ambiente corretamente:

1. **Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto contendo as credenciais públicas do Firebase (`VITE_FIREBASE_*`) e as credenciais do Admin SDK (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

2. **Permissão de Administrador**:
   Para acessar o painel de admin, seu usuário precisa de uma _Custom Claim_ `admin: true`.
   Registre um usuário através do painel na rota `/auth`. Em seguida, execute o script abaixo no servidor/terminal:
   ```sh
   npx tsx scripts/make-admin.ts seu-email@exemplo.com
   ```
   Após o sucesso, deslogue e logue novamente para obter os novos privilégios.

## Testes End-to-End (E2E)

Os testes E2E são executados utilizando o Playwright. Para executá-los:
```sh
npm install
npx playwright test
```
