"use client";

import { BriefcaseBusiness, Home, Menu, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import Link from "next/link";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/nova-analise", label: "Nova análise", icon: Sparkles },
  {
    href: "/candidaturas",
    label: "Candidaturas",
    icon: BriefcaseBusiness,
    activePrefixes: ["/historico/"],
  },
] as const;

export function Sidebar() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarRoot collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="h-20 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link
            href="/inicio"
            className="min-w-0 font-heading text-xl font-semibold tracking-tight group-data-[collapsible=icon]:hidden"
            onClick={() => isMobile && toggleSidebar()}
          >
            Vocare
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className="size-11 shrink-0 group-data-[collapsible=icon]:mx-auto md:size-8"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-5 group-data-[collapsible=icon]:px-2">
          <SidebarGroupLabel className="px-2 text-[0.6875rem] font-semibold tracking-[0.14em]">
            MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Navegação do dashboard">
              <SidebarMenu className="gap-1.5">
                {navigation.map((item) => (
                  <SidebarNavItem key={item.href} {...item} />
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
}

export function DashboardMobileHeader() {
  const { setOpenMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpenMobile(true)}
        aria-label="Abrir menu"
        className="size-11"
      >
        <Menu aria-hidden="true" />
      </Button>
      <Link href="/inicio" className="font-heading text-lg font-semibold">
        Vocare
      </Link>
      <span className="size-9" aria-hidden="true" />
    </header>
  );
}
