import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.primary/15%),transparent)]"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered poster design
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
          Stunning posters,
          <span className="text-primary"> generated in seconds</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
          Describe an idea and Posterly turns it into a beautiful, print-ready
          poster. No design skills required—just your imagination.
        </p>

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Start creating
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full sm:w-auto",
            )}
          >
            See how it works
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required. Free posters every month.
        </p>
      </div>
    </section>
  );
}
