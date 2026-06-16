import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UsageStatus } from "@/services";

export interface FreeTierCapNoticeProps {
  usage: UsageStatus;
}

/**
 * Renders a daily limit banner when the user has exhausted their plan cap.
 * Returns null otherwise. Driven by the shared rate-limit usage status.
 */
export function FreeTierCapNotice({ usage }: FreeTierCapNoticeProps) {
  if (!usage.capReached) {
    return null;
  }

  const message =
    usage.plan === "free"
      ? `You've reached the free daily limit of ${usage.dailyCap} campaigns. Upgrade to keep creating today.`
      : `You've reached today's limit of ${usage.dailyCap} campaigns. Try again tomorrow or buy a credit pack.`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-foreground">{message}</p>
      </div>
      <Link
        href="/billing"
        className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
      >
        {usage.plan === "free" ? "Upgrade" : "Get credits"}
      </Link>
    </div>
  );
}
