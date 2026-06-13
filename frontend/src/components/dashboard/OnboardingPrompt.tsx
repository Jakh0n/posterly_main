import Link from "next/link";
import { Palette } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OnboardingPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Palette className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Set up your brand first</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add your brand name, colors and logo so every poster matches your style.
        It only takes a minute.
      </p>
      <Link href="/onboarding" className={cn(buttonVariants(), "mt-6")}>
        Finish onboarding
      </Link>
    </div>
  );
}
