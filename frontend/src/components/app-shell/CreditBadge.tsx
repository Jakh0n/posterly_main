import { Coins } from "lucide-react";

export interface CreditBadgeProps {
  balance: number;
}

export function CreditBadge({ balance }: CreditBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-medium">
      <Coins className="h-4 w-4 text-primary" />
      {balance}
      <span className="text-muted-foreground">credits</span>
    </span>
  );
}
