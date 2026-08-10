"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";

const DASHBOARD_ROUTES = new Set([
  "/inicio",
  "/nova-analise",
  "/candidaturas",
]);

export function SiteHeader() {
  const pathname = usePathname();
  const { isAnonymous, loading } = useAnonymousSession();

  if (DASHBOARD_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/inicio" className="font-heading text-xl font-semibold">
          Vocare
        </Link>
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          <Link
            href="/candidaturas"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Candidaturas
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
