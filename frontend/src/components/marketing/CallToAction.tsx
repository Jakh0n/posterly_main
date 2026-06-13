import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CallToAction() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Ready to make your first poster?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
          Join creators using Posterly to ship beautiful designs in minutes.
        </p>
        <Link
          href="/signup"
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-8")}
        >
          Get started for free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
