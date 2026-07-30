import type { Database } from "@/lib/supabase/database.types";

export const APPLICATION_CHANNEL_NAME_MAX_LENGTH = 50;

type ApplicationChannelRow =
  Database["public"]["Tables"]["application_channels"]["Row"];

export type ApplicationChannel = Pick<
  ApplicationChannelRow,
  "id" | "name"
>;

const PORTUGUESE_ACCENT_MAP: Record<string, string> = {
  Á: "A",
  À: "A",
  Â: "A",
  Ã: "A",
  Ä: "A",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  Í: "I",
  Ì: "I",
  Î: "I",
  Ï: "I",
  Ó: "O",
  Ò: "O",
  Ô: "O",
  Õ: "O",
  Ö: "O",
  Ú: "U",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ç: "C",
  Ñ: "N",
  á: "a",
  à: "a",
  â: "a",
  ã: "a",
  ä: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  ó: "o",
  ò: "o",
  ô: "o",
  õ: "o",
  ö: "o",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  ç: "c",
  ñ: "n",
};

const PORTUGUESE_ACCENT_PATTERN =
  /[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ]/g;
export function cleanApplicationChannelName(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function normalizeApplicationChannelKey(value: string) {
  return cleanApplicationChannelName(value)
    .replace(
      PORTUGUESE_ACCENT_PATTERN,
      (character) => PORTUGUESE_ACCENT_MAP[character] ?? character,
    )
    .toLowerCase();
}
