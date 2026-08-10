import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  displayName: string;
  firstName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
};

const ANONYMOUS_NAME = "Candidato";
const ANONYMOUS_EMAIL = "Sessão anônima";
const UNKNOWN_USER_NAME = "Usuário Vocare";
const UNKNOWN_USER_EMAIL = "E-mail não informado";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizedText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized || null;
}

function metadataText(metadata: unknown, keys: readonly string[]) {
  if (!isRecord(metadata)) {
    return null;
  }

  for (const key of keys) {
    const value = normalizedText(metadata[key]);

    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeAvatarUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function capitalizeWord(value: string) {
  const [firstCharacter, ...remainingCharacters] = Array.from(value);

  if (!firstCharacter) {
    return "";
  }

  return `${firstCharacter.toLocaleUpperCase("pt-BR")}${remainingCharacters
    .join("")
    .toLocaleLowerCase("pt-BR")}`;
}

function nameFromEmail(email: string | null) {
  if (!email) {
    return null;
  }

  const localPart = email.split("@", 1)[0]?.split("+", 1)[0] ?? "";
  const words = localPart
    .split(/[._-]+/u)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return null;
  }

  return words.map(capitalizeWord).join(" ");
}

function initialsFromName(displayName: string) {
  const words = displayName.split(/\s+/u).filter(Boolean);

  if (words.length === 0) {
    return "VC";
  }

  const characters =
    words.length === 1
      ? Array.from(words[0]).slice(0, 2)
      : [Array.from(words[0])[0], Array.from(words.at(-1) ?? "")[0]];

  return characters
    .filter((character): character is string => Boolean(character))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function getUserProfile(
  user: User | null | undefined,
): UserProfile {
  const metadata: unknown = user?.user_metadata;
  const isAnonymous = !user || user.is_anonymous === true;
  const email = normalizedText(user?.email);
  const metadataName = metadataText(metadata, [
    "full_name",
    "display_name",
    "name",
  ]);
  const displayName =
    metadataName ??
    nameFromEmail(email) ??
    (isAnonymous ? ANONYMOUS_NAME : UNKNOWN_USER_NAME);
  const firstName = displayName.split(/\s+/u)[0] || ANONYMOUS_NAME;
  const avatarUrl = normalizeAvatarUrl(
    metadataText(metadata, ["avatar_url", "picture"]),
  );

  return {
    displayName,
    firstName,
    email: email ?? (isAnonymous ? ANONYMOUS_EMAIL : UNKNOWN_USER_EMAIL),
    avatarUrl,
    initials: initialsFromName(displayName),
  };
}
