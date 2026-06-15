import { AlertTriangle, Infinity as InfinityIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UsageStatus } from "@/services";

export interface UsageMeterProps {
  usage: UsageStatus;
}

export function UsageMeter({ usage }: UsageMeterProps) {
  if (usage.dailyCap === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily usage</CardTitle>
          <CardDescription>Pro plan — no daily limit.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <InfinityIcon className="h-4 w-4 text-primary" />
          Unlimited campaigns per day
        </CardContent>
      </Card>
    );
  }

  const pct = Math.min(100, Math.round((usage.dailyUsed / usage.dailyCap) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily usage</CardTitle>
        <CardDescription>
          {usage.dailyUsed} of {usage.dailyCap} campaigns used today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usage.capReached ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {usage.capReached ? (
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            You&apos;ve hit the free-tier daily limit. Upgrade to keep creating.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {usage.remaining} campaign{usage.remaining === 1 ? "" : "s"} left
            today on the free plan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
