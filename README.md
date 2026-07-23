# Vocare

Aplicação web para adaptar currículos a vagas específicas com IA. O usuário informa a descrição da vaga e envia o currículo em PDF, Markdown ou TXT; a aplicação gera um currículo otimizado em Markdown, um PDF para download e um e-mail de candidatura com os dados do próprio candidato.

## Funcionalidades

- Análise da descrição da vaga e do currículo com Gemini.
- Entrada de currículo por texto Markdown, arquivo `.md`, `.txt` ou `.pdf`.
- Extração de conteúdo de PDF antes da otimização.
- Geração de currículo otimizado em Markdown.
- Exportação do currículo otimizado em PDF.
- Geração de e-mail de candidatura com assunto, corpo e assinatura baseada nos contatos do currículo.
- Abertura rápida do e-mail no Gmail ou no cliente padrão do sistema.
- Sessão anônima automática com Supabase Auth, sem interromper o primeiro uso.
- Histórico de candidaturas protegido por Row Level Security (RLS).
- Conversão da sessão anônima em conta permanente sem alterar o `user_id`.
- Identificação automática do título da vaga e da empresa quando esses campos não forem preenchidos.

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Gemini 3.5 Flash
- Puppeteer / Chromium para geração de PDF
- shadcn/base-ui para componentes de interface
- Supabase Auth, Postgres e RLS

## Requisitos

- Node.js compatível com Next.js 16
- npm
- Chave de API do Gemini

## Configuração

Instale as dependências:

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha as chaves:

```env
GEMINI_API_KEY=sua_chave_do_gemini
GEMINI_MODEL=gemini-3.5-flash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel_do_supabase
```

Não use a secret key ou uma service role key nas variáveis `NEXT_PUBLIC_*`.

### Configuração do Supabase

O arquivo `supabase/config.toml` configura o ambiente local com:

- `enable_anonymous_sign_ins = true`;
- `enable_manual_linking = true`;
- limite de 10 usuários anônimos por IP/hora;
- confirmação obrigatória de e-mail.

Para aplicar a migration localmente:

```bash
npx supabase start
npx supabase db reset
```

Para um projeto hospedado, vincule o projeto e envie as migrations com a CLI ou
execute `supabase/migrations/20260720000000_create_candidaturas.sql` no SQL
Editor. Depois, no Dashboard:

1. Em **Authentication > Providers**, permita Anonymous Sign-Ins e Email.
2. Habilite o vínculo manual de identidades.
3. Adicione `http://localhost:3000/auth/callback` e a URL equivalente de
   produção à lista de Redirect URLs.
4. Em **Authentication > Rate Limits**, ajuste Anonymous Sign-Ins para no
   máximo 10 por IP/hora como ponto de partida.
5. Em produção, considere Cloudflare Turnstile ou hCaptcha em
   **Authentication > Bot and Abuse Protection**.

CAPTCHA não vem ativado no código porque o bootstrap atual é silencioso. Ao
ativá-lo no Dashboard, obtenha o token no client e envie-o em
`signInAnonymously({ options: { captchaToken } })` dentro de
`hooks/use-anonymous-session.ts`.

Usuários anônimos permanecem no `auth.users`. O Supabase não os remove
automaticamente; defina uma rotina de retenção para usuários anônimos antigos
que não possuam candidaturas, conforme a política do produto.

## Rodando em desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000` no navegador. Se a porta `3000` já estiver em uso, o Next.js pode sugerir outra porta.

## Scripts

```bash
npm run dev
```

Inicia o servidor local de desenvolvimento.

```bash
npm run build
```

Gera a build de produção. Este comando pode precisar de acesso à internet para baixar fontes usadas pelo `next/font`.

```bash
npm run start
```

Inicia a aplicação a partir da build de produção.

```bash
npm run lint
```

Executa o ESLint no projeto.

## Como Usar

1. Cole a descrição completa da vaga.
2. Cole o currículo em Markdown ou selecione um arquivo PDF, Markdown ou TXT.
3. Clique em `Analisar com IA`.
4. Revise o currículo otimizado.
5. Baixe o resultado em Markdown ou PDF.
6. Revise o e-mail gerado e abra no Gmail ou no cliente de e-mail padrão.

## Variáveis de Ambiente

| Nome | Obrigatória | Descrição |
| --- | --- | --- |
| `GEMINI_API_KEY` | Sim | Chave usada nas chamadas ao Gemini para análise do currículo, extração de PDF e geração de e-mail. |
| `GEMINI_MODEL` | Não | Modelo utilizado nas análises; o padrão é `gemini-3.5-flash`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL pública do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Publishable key usada pelos clientes Supabase. |

## Rotas Principais

| Rota | Método | Descrição |
| --- | --- | --- |
| `/` | `GET` | Interface principal da aplicação. |
| `/api/analyze` | `POST` | Recebe descrição da vaga e currículo, processa com Gemini e retorna currículo/e-mail gerados. |
| `/api/pdf` | `POST` | Recebe Markdown e retorna um PDF renderizado. |
| `/historico` | `GET` | Lista as candidaturas da sessão atual via RLS. |
| `/conta` | `GET` | Converte a sessão anônima ou entra em uma conta existente. |
| `/conta/confirmar` | `GET` | Define a senha depois da confirmação do e-mail. |
| `/auth/callback` | `GET` | Troca o código de confirmação por uma sessão Supabase. |

## Entrada de Arquivos

A rota `/api/analyze` aceita dois formatos. `vagaTitulo` e `empresa` são
opcionais; quando estiverem vazios, o Gemini tenta extraí-los da descrição:

- JSON com `description`, `curriculum`, `vagaTitulo` e `empresa`.
- `multipart/form-data` com `description`, `curriculum` opcional,
  `curriculumFile`, `vagaTitulo` e `empresa`.

Formatos aceitos para `curriculumFile`:

- `.pdf`
- `.md`
- `.markdown`
- `.txt`

O tamanho máximo do arquivo é de 10 MB.

## Estrutura do Projeto

```text
app/
  auth/callback/route.ts # confirmação de identidade Supabase
  api/
    analyze/route.ts  # análise com Gemini e leitura de PDF/Markdown/TXT
    pdf/route.ts      # geração de PDF a partir de Markdown
  conta/              # conversão da conta anônima e definição de senha
  historico/page.tsx  # histórico protegido por RLS
  page.tsx            # tela principal
components/
  analysis-results.tsx
  anonymous-session-bootstrap.tsx
  conversion-banner.tsx
  site-header.tsx
  ui/
hooks/
  use-anonymous-session.ts
lib/
  email-utils.ts
  pdf-template.ts
  prompts.ts
  supabase/           # clientes browser/server, proxy e tipos
  utils.ts
supabase/
  config.toml
  migrations/
```

## Observações

- A geração de PDF usa `puppeteer` em desenvolvimento e `puppeteer-core` com `@sparticuz/chromium` em produção/serverless.
- PDFs baseados em imagem ou digitalizados podem ter extração menos precisa.
- O e-mail gerado deve assinar com os dados encontrados no currículo do candidato; dados ausentes são omitidos.
- O `insert` no histórico usa a sessão da própria requisição e respeita RLS. Uma falha ao salvar é registrada no servidor, mas não invalida a análise Gemini.
- Entrar em uma conta já existente não mescla candidaturas da sessão anônima. A interface avisa sobre essa perda de vínculo e o código contém um `TODO` para a futura regra de negócio.

## Roteiro manual: anônimo → conta permanente

1. Abra a aplicação em uma janela anônima do navegador.
2. Confirme no Dashboard do Supabase que foi criado um usuário com
   `is_anonymous = true` e anote seu UUID.
3. Gere uma análise e abra `/historico`.
4. Confirme que há uma linha em `candidaturas` com o mesmo UUID em `user_id`.
5. Em `/conta`, informe um e-mail ainda não cadastrado.
6. Abra o link de confirmação no mesmo navegador e defina uma senha com pelo
   menos 8 caracteres.
7. Confirme no Dashboard que o usuário deixou de ser anônimo e manteve o UUID
   anotado no passo 2.
8. Volte a `/historico` e verifique que a candidatura anterior continua
   disponível, sem duplicação.
9. Em outro navegador, entre com o e-mail e a senha e confirme que o mesmo
   histórico aparece.
10. Como caso de borda, tente converter outra sessão anônima usando um e-mail
    já cadastrado. A interface deve pedir login e avisar que não há merge
    automático.
