import Link from "next/link";
import { ImagePlus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ImagePlus className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">No campaigns yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first AI poster from a product photo. It only takes a few
        seconds.
      </p>
      <Link href="/spike" className={cn(buttonVariants(), "mt-6")}>
        Create your first poster
      </Link>
    </div>
  );
}
