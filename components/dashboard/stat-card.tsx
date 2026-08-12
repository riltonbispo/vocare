import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardBaseProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
};

type StatCardProps = StatCardBaseProps &
  (
    | {
        action: ReactNode;
        actionLabel?: never;
        href?: never;
      }
    | {
        action?: never;
        actionLabel: string;
        href?: string;
      }
  );

export function StatCard({
  title,
  description,
  actionLabel,
  href,
  action,
  icon: Icon,
  featured = false,
}: StatCardProps) {
  return (
    <Card className="min-h-56 justify-between">
      <CardHeader>
        <div
          className={cn(
            "mb-2 flex size-11 items-center justify-center rounded-2xl",
            featured
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="max-w-md leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {action !== undefined ? (
          action
        ) : href ? (
          <Link
            href={href}
            className={buttonVariants({
              variant: featured ? "default" : "outline",
            })}
          >
            {actionLabel}
          </Link>
        ) : (
          <Button type="button" variant="outline" disabled>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
