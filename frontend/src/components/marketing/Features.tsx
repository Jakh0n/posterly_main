import { Palette, Wand2, Download, Zap } from "lucide-react";

import { FeatureCard, type FeatureCardProps } from "./FeatureCard";

const FEATURES: FeatureCardProps[] = [
  {
    icon: Wand2,
    title: "Prompt to poster",
    description:
      "Type what you want and watch a polished design appear in seconds.",
  },
  {
    icon: Palette,
    title: "On-brand styles",
    description:
      "Pick from curated themes or match your own colors, fonts and tone.",
  },
  {
    icon: Download,
    title: "Print-ready exports",
    description:
      "Download high-resolution files ready for screen, social or print.",
  },
  {
    icon: Zap,
    title: "Built for speed",
    description:
      "Iterate fast with instant regenerations and smart variations.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to design faster
        </h2>
        <p className="mt-4 text-muted-foreground">
          Posterly handles the heavy lifting so you can focus on your message.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
