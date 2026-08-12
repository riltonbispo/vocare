import { marked } from "marked";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildResumeHtml(markdown: string, candidateName = "Currículo") {
  const contentHtml = marked.parse(markdown, { breaks: true });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${candidateName}</title>
<style>
  @page {
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1f1f1f;
    line-height: 1.6;
    padding: 56px 64px;
    max-width: 800px;
    margin: 0 auto;
    font-size: 14px;
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px 0;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b6b6b;
    margin: 28px 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e5e5;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 16px 0 2px 0;
  }

  p {
    margin: 4px 0;
    color: #3a3a3a;
  }

  ul {
    margin: 6px 0;
    padding-left: 20px;
  }

  li {
    margin: 3px 0;
    color: #3a3a3a;
  }

  hr {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 20px 0;
  }

  strong {
    font-weight: 600;
    color: #1f1f1f;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }

  .header-meta {
    font-size: 13px;
    color: #6b6b6b;
    margin-top: 4px;
  }
</style>
</head>
<body>
  ${contentHtml}
</body>
</html>
`;
}

export function buildCoverLetterHtml(content: string) {
  const escapedContent = escapeHtml(content);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Carta de apresentação</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #262626;
    background: #ffffff;
    padding: 72px 76px;
    font-size: 14px;
    line-height: 1.75;
  }

  .letter-content {
    max-width: 642px;
    margin: 0 auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
</head>
<body>
  <main class="letter-content">${escapedContent}</main>
</body>
</html>
`;
}
