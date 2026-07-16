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

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Gemini 2.5 Flash
- Puppeteer / Chromium para geração de PDF
- shadcn/base-ui para componentes de interface

## Requisitos

- Node.js compatível com Next.js 16
- npm
- Chave de API do Gemini

## Configuração

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_do_gemini
```

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

## Rotas Principais

| Rota | Método | Descrição |
| --- | --- | --- |
| `/` | `GET` | Interface principal da aplicação. |
| `/api/analyze` | `POST` | Recebe descrição da vaga e currículo, processa com Gemini e retorna currículo/e-mail gerados. |
| `/api/pdf` | `POST` | Recebe Markdown e retorna um PDF renderizado. |

## Entrada de Arquivos

A rota `/api/analyze` aceita dois formatos:

- JSON com `description` e `curriculum`.
- `multipart/form-data` com `description`, `curriculum` opcional e `curriculumFile`.

Formatos aceitos para `curriculumFile`:

- `.pdf`
- `.md`
- `.markdown`
- `.txt`

O tamanho máximo do arquivo é de 10 MB.

## Estrutura do Projeto

```text
app/
  api/
    analyze/route.ts  # análise com Gemini e leitura de PDF/Markdown/TXT
    pdf/route.ts      # geração de PDF a partir de Markdown
  page.tsx            # tela principal
components/
  analysis-results.tsx
  ui/
lib/
  email-utils.ts
  pdf-template.ts
  prompts.ts
  utils.ts
```

## Observações

- A geração de PDF usa `puppeteer` em desenvolvimento e `puppeteer-core` com `@sparticuz/chromium` em produção/serverless.
- PDFs baseados em imagem ou digitalizados podem ter extração menos precisa.
- O e-mail gerado deve assinar com os dados encontrados no currículo do candidato; dados ausentes são omitidos.
