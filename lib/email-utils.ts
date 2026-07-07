export function parseGeneratedEmail(raw: string): {
  subject: string;
  body: string;
} {
  const match = raw.match(/Assunto:\s*(.+)\n+([\s\S]+)/i);

  if (!match) {
    return { subject: "", body: raw.trim() };
  }

  return {
    subject: match[1].trim(),
    body: match[2].trim(),
  };
}

export function extractEmailFromText(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
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