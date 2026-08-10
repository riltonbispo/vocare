import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  headingLevel?: "h2" | "h3";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
  headingLevel = "h2",
}: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-5 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <Heading className="font-heading text-lg font-medium">{title}</Heading>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link href={href} className={buttonVariants({ className: "mt-6" })}>
        {actionLabel}
      </Link>
    </div>
  );
}
