"use client";

import { useAnonymousSession } from "@/hooks/use-anonymous-session";

export function AnonymousSessionBootstrap() {
  useAnonymousSession();
  return null;
}
