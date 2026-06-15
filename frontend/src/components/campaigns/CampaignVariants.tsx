import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Creative } from "@/types/campaign";

export interface CampaignVariantsProps {
  creatives: Creative[];
}

function variantLabel(creative: Creative): string {
  const template = creative.layout?.template;
  if (template) {
    return template.charAt(0).toUpperCase() + template.slice(1);
  }
  return `Variant ${creative.variant_index + 1}`;
}

export function CampaignVariants({ creatives }: CampaignVariantsProps) {
  const ready = creatives
    .filter((c) => c.final_url)
    .sort((a, b) => a.variant_index - b.variant_index);

  if (ready.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ready.map((creative) => (
        <Card key={creative.id} className="gap-0 py-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creative.final_url as string}
            alt={`${variantLabel(creative)} poster`}
            className="aspect-square w-full object-cover"
          />
          <CardContent className="py-3">
            <p className="text-sm font-medium">{variantLabel(creative)}</p>
          </CardContent>
          <CardFooter className="justify-end">
            <a
              href={creative.final_url as string}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open full size
            </a>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
