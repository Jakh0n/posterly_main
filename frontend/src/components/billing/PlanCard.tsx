import { Coins, Crown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserPlan } from "@/services";

export interface PlanCardProps {
  plan: UserPlan;
  balance: number;
}

const PLAN_LABEL: Record<UserPlan, string> = {
  free: "Free",
  pro: "Pro",
};

export function PlanCard({ plan, balance }: PlanCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          Current plan
        </CardTitle>
        <CardDescription>
          You are on the {PLAN_LABEL[plan]} plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-2xl font-semibold tracking-tight">
          {PLAN_LABEL[plan]}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-medium">
          <Coins className="h-4 w-4 text-primary" />
          {balance}
          <span className="text-muted-foreground">credits</span>
        </span>
      </CardContent>
    </Card>
  );
}
