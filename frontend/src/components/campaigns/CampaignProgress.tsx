"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Campaign, CampaignStatus, Creative } from "@/types/campaign";

import { CampaignVariants } from "./CampaignVariants";

export interface CampaignProgressProps {
  initialCampaign: Campaign;
  initialCreatives: Creative[];
}

interface Stage {
  key: Exclude<CampaignStatus, "queued" | "done" | "failed">;
  label: string;
}

const STAGES: Stage[] = [
  { key: "writing", label: "Writing creative briefs" },
  { key: "generating", label: "Painting product scenes" },
  { key: "composing", label: "Composing your posters" },
];

const STATUS_ORDER: Record<CampaignStatus, number> = {
  queued: 0,
  writing: 1,
  generating: 2,
  composing: 3,
  done: 4,
  failed: -1,
};

const POLL_INTERVAL_MS = 4000;

function isTerminal(status: CampaignStatus): boolean {
  return status === "done" || status === "failed";
}

export function CampaignProgress({
  initialCampaign,
  initialCreatives,
}: CampaignProgressProps) {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [creatives, setCreatives] = useState<Creative[]>(initialCreatives);
  const supabaseRef = useRef(createBrowserClient());

  const mergeCreative = useCallback((next: Creative) => {
    setCreatives((prev) => {
      const exists = prev.some((c) => c.id === next.id);
      const merged = exists
        ? prev.map((c) => (c.id === next.id ? { ...c, ...next } : c))
        : [...prev, next];
      return merged.sort((a, b) => a.variant_index - b.variant_index);
    });
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const campaignId = initialCampaign.id;
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        supabase.realtime.setAuth(data.session.access_token);
      }
    });

    const channel = supabase
      .channel(`campaign:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          if (active) {
            setCampaign((prev) => ({ ...prev, ...(payload.new as Campaign) }));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "creatives",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (active && payload.new && "id" in payload.new) {
            mergeCreative(payload.new as Creative);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [initialCampaign.id, mergeCreative]);

  // Polling fallback: guarantees progress is reflected even if a Realtime
  // event is missed. Stops once the campaign reaches a terminal state.
  useEffect(() => {
    if (isTerminal(campaign.status)) {
      return;
    }

    const supabase = supabaseRef.current;
    const campaignId = initialCampaign.id;

    const interval = setInterval(async () => {
      const { data: row } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (row) {
        setCampaign(row as Campaign);
      }

      const { data: rows } = await supabase
        .from("creatives")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("variant_index", { ascending: true });
      if (rows) {
        setCreatives(rows as Creative[]);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [campaign.status, initialCampaign.id]);

  const currentOrder = STATUS_ORDER[campaign.status];

  if (campaign.status === "failed") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h2 className="text-lg font-semibold">Generation failed</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {campaign.error ?? "Something went wrong while generating."} Your
            credit has been refunded.
          </p>
          <Link
            href="/campaigns/new"
            className={cn(buttonVariants(), "mt-2")}
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {campaign.status !== "done" ? (
        <ol className="flex flex-col gap-3">
          {STAGES.map((stage) => {
            const order = STATUS_ORDER[stage.key];
            const done = currentOrder > order;
            const active = currentOrder === order;
            return (
              <li
                key={stage.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                  active && "border-primary/40 bg-primary/5",
                  done && "border-border bg-muted/40 text-muted-foreground",
                  !active && !done && "border-border/60 text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-current" />
                )}
                <span className="font-medium">
                  {stage.label}
                  {active ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Your 3 variants are ready.
        </div>
      )}

      <CampaignVariants creatives={creatives} />
    </div>
  );
}
