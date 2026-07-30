export function extractEmailFromText(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

export function parseOutreachEmail(text: string) {
  const match = text.match(
    /^\s*Assunto:\s*([^\r\n]*)(?:(?:\r?\n){1,2}([\s\S]*))?$/i,
  );

  if (!match) {
    return { subject: "", body: text.trim() };
  }

  return {
    subject: match[1]?.trim() ?? "",
    body: match[2]?.trim() ?? "",
  };
}

export function formatOutreachEmail({
  subject,
  body,
}: {
  subject: string;
  body: string;
}) {
  const normalizedSubject = subject.trim();
  const normalizedBody = body.trim();

  if (!normalizedSubject) return normalizedBody;
  if (!normalizedBody) return `Assunto: ${normalizedSubject}`;

  return `Assunto: ${normalizedSubject}\n\n${normalizedBody}`;
}

export function buildGmailComposeUrl({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildMailtoUrl({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to}?${params.toString()}`;
}
