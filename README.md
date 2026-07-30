# Vocare

Aplicação web para adaptar currículos a vagas específicas com IA. O usuário informa a descrição da vaga e envia o currículo em PDF, Markdown ou TXT; a aplicação gera um currículo otimizado em Markdown, um PDF para download e um e-mail de candidatura com os dados do próprio candidato.

## Funcionalidades

- Análise da descrição da vaga e do currículo com Gemini.
- Entrada de currículo por texto Markdown, arquivo `.md`, `.txt` ou `.pdf`.
- Processamento multimodal de PDF, sem uma chamada separada de extração.
- Geração estruturada de currículo, e-mail e metadados em uma única operação.
- Geração de currículo otimizado em Markdown.
- Exportação do currículo otimizado em PDF.
- Geração de e-mail de candidatura com assunto, corpo e assinatura baseada nos contatos do currículo.
- Abertura rápida do e-mail no Gmail ou no cliente padrão do sistema.
- Sessão anônima automática com Supabase Auth, sem interromper o primeiro uso.
- Histórico de candidaturas protegido por Row Level Security (RLS).
- Conversão da sessão anônima em conta permanente sem alterar o `user_id`.
- Identificação automática do título da vaga e da empresa quando esses campos não forem preenchidos.
- Catálogo reutilizável de canais de candidatura por usuário, com seleção de
  múltiplas tags e criação de novos canais no detalhe da candidatura.
- Badges de canais nos cartões do histórico e filtro com a opção
  **Todos os canais**.

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Gemini 3.5 Flash
- Google Gen AI SDK e Zod
- Puppeteer / Chromium para geração de PDF
- shadcn/base-ui para componentes de interface
- TanStack Query para queries e mutations no detalhe das candidaturas
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
GEMINI_MODELS=gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash
GEMINI_TIMEOUT_MS=25000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel_do_supabase
```

Não use a secret key ou uma service role key nas variáveis `NEXT_PUBLIC_*`.

### Modelos Gemini

A aplicação usa os modelos de `GEMINI_MODELS` na ordem informada e avança
automaticamente quando uma tentativa não pode ser concluída.

Modelos gerais compatíveis com o fluxo atual de PDF, texto e resposta JSON
estruturada:

- `gemini-3.6-flash`: modelo principal recomendado;
- `gemini-3.5-flash-lite`: alternativa rápida e econômica para documentos;
- `gemini-3.5-flash`: alternativa de maior qualidade, sujeita a picos de demanda;
- `gemini-3.1-flash-lite`: alternativa estável de baixo custo;
- `gemini-2.5-flash`: alternativa madura para compatibilidade;
- `gemini-2.5-flash-lite`: alternativa econômica da família 2.5;
- `gemini-2.5-pro`: alternativa de maior custo e latência.

Evite modelos especializados em imagem, TTS ou robótica. Também evite versões
`preview`, aliases `latest` e modelos 2.0 em produção, pois podem mudar ou ser
descontinuados com menor previsibilidade.

### Configuração do Supabase

O arquivo `supabase/config.toml` configura o ambiente local com:

- `enable_anonymous_sign_ins = true`;
- `enable_manual_linking = true`;
- limite de 10 usuários anônimos por IP/hora;
- confirmação obrigatória de e-mail.

A migration de canais adiciona duas tabelas:

- `application_channels`: catálogo de canais pertencentes ao usuário;
- `application_channel_assignments`: relacionamento muitos-para-muitos entre
  canais e candidaturas.

Os nomes têm os espaços normalizados e são deduplicados por usuário sem
considerar diferenças de maiúsculas, espaços extras e acentuação. O nome
amigável informado pelo usuário, como `WhatsApp`, continua sendo usado na
interface.

As duas tabelas usam RLS. Usuários autenticados, inclusive sessões anônimas
criadas pelo Supabase Auth, somente podem consultar e alterar os próprios
canais e relacionamentos. As constraints do relacionamento também impedem
associar um canal a uma candidatura de outro usuário. Remover uma associação
não apaga o canal do catálogo reutilizável.

Para aplicar a migration localmente:

```bash
npx supabase start
npx supabase db reset
```

Para um projeto hospedado, vincule o projeto e envie todas as migrations:

```bash
npx supabase link --project-ref seu-project-ref
npx supabase db push
```

Depois, no Dashboard:

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
7. No detalhe da candidatura, selecione canais existentes ou digite um novo
   canal e pressione `Enter` para criá-lo e associá-lo.
8. Em `/historico`, consulte os canais nos badges dos cartões ou filtre as
   candidaturas por um canal específico.

## Variáveis de Ambiente

| Nome | Obrigatória | Descrição |
| --- | --- | --- |
| `GEMINI_API_KEY` | Sim | Chave usada na análise estruturada do currículo, da vaga e do e-mail com Gemini. |
| `GEMINI_MODELS` | Não | Lista ordenada, separada por vírgulas, dos modelos usados na análise. Em erros transitórios, modelo ausente ou resposta inválida, a rota tenta o próximo. O padrão é `gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash`. |
| `GEMINI_TIMEOUT_MS` | Não | Tempo limite de cada tentativa em milissegundos; o padrão é `25000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL pública do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Publishable key usada pelos clientes Supabase. |

## Rotas Principais

| Rota | Método | Descrição |
| --- | --- | --- |
| `/` | `GET` | Interface principal da aplicação. |
| `/api/analyze` | `POST` | Recebe descrição da vaga e currículo, faz uma análise estruturada com Gemini e retorna currículo/e-mail gerados. |
| `/api/pdf` | `POST` | Recebe Markdown e retorna um PDF renderizado. |
| `/api/application-channels` | `GET`, `POST` | Lista os canais reutilizáveis da sessão atual ou cria um novo canal. |
| `/api/applications/[id]` | `GET`, `PATCH`, `DELETE` | Consulta, atualiza ou exclui uma candidatura da sessão atual. |
| `/api/applications/[id]/channels` | `GET`, `POST`, `DELETE` | Lista, associa ou remove canais da candidatura, após validar a sessão e a propriedade dos recursos. |
| `/historico` | `GET` | Lista as candidaturas da sessão atual via RLS. |
| `/historico/[id]` | `GET` | Exibe materiais, resultado e acompanhamento de uma candidatura. |
| `/conta` | `GET` | Converte a sessão anônima ou entra em uma conta existente. |
| `/conta/confirmar` | `GET` | Define a senha depois da confirmação do e-mail. |
| `/auth/callback` | `GET` | Troca o código de confirmação por uma sessão Supabase. |

## Modelo de dados dos canais

| Tabela | Finalidade |
| --- | --- |
| `application_channels` | Mantém o catálogo reutilizável do usuário, o nome amigável e sua chave normalizada para deduplicação. |
| `application_channel_assignments` | Associa vários canais a várias candidaturas sem transferir a propriedade entre usuários. |

As exclusões usam `ON DELETE CASCADE` para limpar relacionamentos quando uma
candidatura, um canal ou o usuário proprietário é removido. Excluir somente
uma linha de `application_channel_assignments` mantém o canal disponível para
outras candidaturas.

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
    analyze/route.ts  # entrada, resposta HTTP e persistência da análise
    application-channels/route.ts # catálogo reutilizável de canais
    applications/[id]/route.ts # consulta, edição e exclusão de candidatura
    applications/[id]/channels/route.ts # associações de canais
    pdf/route.ts      # geração de PDF a partir de Markdown
  conta/              # conversão da conta anônima e definição de senha
  historico/          # listagem e detalhe protegidos por RLS
  page.tsx            # tela principal
components/
  analysis-results.tsx
  application-channels-field.tsx
  application-detail-view.tsx
  conversion-banner.tsx
  query-provider.tsx
  site-header.tsx
  ui/
hooks/
  use-anonymous-session.ts
lib/
  application-channels.ts # tipos, limite e normalização dos nomes de canais
  email-utils.ts
  gemini/analyze.ts    # chamada estruturada única, retry e validação
  pdf-template.ts
  prompts.ts
  supabase/           # clientes browser/server, proxy e tipos
  utils.ts
supabase/
  config.toml
  migrations/
    20260730000000_application_channels.sql
```

## Observações

- A geração de PDF usa `puppeteer` em desenvolvimento e `puppeteer-core` com `@sparticuz/chromium` em produção/serverless.
- PDFs são enviados diretamente ao Gemini na mesma operação que gera os
  resultados. A transcrição original retornada também é salva no histórico.
- PDFs baseados em imagem ou digitalizados podem ter transcrição menos precisa.
- Uma análise usa uma chamada lógica ao Gemini; erros transitórios podem gerar
  novas tentativas automáticas com backoff.
- O e-mail gerado deve assinar com os dados encontrados no currículo do candidato; dados ausentes são omitidos.
- O `insert` no histórico usa a sessão da própria requisição e respeita RLS. Uma falha ao salvar é registrada no servidor, mas não invalida a análise Gemini.
- Os canais são salvos no catálogo do usuário e podem ser reutilizados em
  outras candidaturas. Remover um badge no detalhe exclui apenas a associação.
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
