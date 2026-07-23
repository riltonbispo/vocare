"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";

export function SiteHeader() {
  const { isAnonymous, loading } = useAnonymousSession();

  return (
    <header className="border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-xl font-semibold">
          Vocare
        </Link>
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          <Link
            href="/historico"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Histórico
          </Link>
          <Link
            href="/conta"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {loading ? "Conta" : isAnonymous ? "Criar conta" : "Minha conta"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
