import Link from "next/link";
import { Sparkles } from "lucide-react";

import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-background md:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg tracking-tight">Posterly</span>
        </Link>
      </div>
      <div className="flex-1 px-3 py-4">
        <NavLinks />
      </div>
    </aside>
  );
}
