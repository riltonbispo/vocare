"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type SidebarNavItemProps = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isActive = pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        className="h-11 rounded-xl px-3 text-sidebar-foreground/70 data-active:bg-primary/10 data-active:text-primary hover:text-sidebar-foreground"
        render={
          <Link
            href={href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setOpenMobile(false)}
          />
        }
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
