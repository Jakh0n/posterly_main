import { CreditBadge } from "./CreditBadge";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";

export interface TopbarProps {
  email: string;
  balance: number;
}

export function Topbar({ email, balance }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <div className="flex flex-1 items-center justify-end gap-3">
        <CreditBadge balance={balance} />
        <UserMenu email={email} />
      </div>
    </header>
  );
}
