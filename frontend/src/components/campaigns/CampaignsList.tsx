import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/utils/format";
import type { Campaign, CampaignStatus } from "@/types/campaign";

export interface CampaignsListProps {
  campaigns: Campaign[];
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  writing: "bg-primary/10 text-primary",
  generating: "bg-primary/10 text-primary",
  composing: "bg-primary/10 text-primary",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function CampaignsList({ campaigns }: CampaignsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {campaigns.map((campaign) => (
        <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
          <Card className="transition-colors hover:bg-muted/40">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate font-medium">{campaign.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(campaign.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={campaign.status} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
