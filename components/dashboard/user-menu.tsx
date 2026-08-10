"use client";

import { ChevronUp, LogOut, RotateCcw, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";
import { getUserProfile } from "@/lib/user-profile";

export function UserMenu() {
  const {
    user,
    isAnonymous,
    loading,
    error: authError,
  } = useAnonymousSession();
  const [signingOut, setSigningOut] = useState(false);
  const profile = getUserProfile(user);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.assign("/inicio");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível sair.",
      );
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-14 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-14 w-full min-w-0 items-center gap-3 rounded-xl px-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            aria-label="Abrir menu da conta"
          />
        }
      >
        <Avatar className="size-9" aria-hidden="true">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt="" />
          )}
          <AvatarFallback className="bg-primary/10 font-medium text-primary">
            {profile.initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">
            {profile.displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {!user && authError ? "Conta indisponível" : profile.email}
          </span>
        </span>
        <ChevronUp
          className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {!user
              ? "Não foi possível carregar a conta"
              : isAnonymous
                ? "Sessão temporária"
                : "Minha conta"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!user ? (
            <DropdownMenuItem onClick={() => window.location.reload()}>
              <RotateCcw aria-hidden="true" />
              Tentar novamente
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem render={<Link href="/conta" />}>
              <Settings aria-hidden="true" />
              {isAnonymous ? "Criar conta" : "Configurações"}
            </DropdownMenuItem>
          )}
          {user && !isAnonymous && (
            <DropdownMenuItem
              onClick={() => void handleSignOut()}
              disabled={signingOut}
            >
              <LogOut aria-hidden="true" />
              {signingOut ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
