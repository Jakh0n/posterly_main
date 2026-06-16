import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const VARIANT_COUNT = 3;

export function CampaignVariantsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: VARIANT_COUNT }, (_, index) => (
        <Card key={index} className="gap-0 overflow-hidden py-0">
          <Skeleton className="aspect-square w-full rounded-none" />
          <CardContent className="space-y-2 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
          <CardFooter className="justify-end gap-2 pb-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
