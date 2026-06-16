"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Campaign, CampaignStatus, Creative } from "@/types/campaign";

import { CampaignFailedState } from "./CampaignFailedState";
import { CampaignVariants } from "./CampaignVariants";
import { CampaignVariantsSkeleton } from "./CampaignVariantsSkeleton";

export interface CampaignProgressProps {
  initialCampaign: Campaign;
  initialCreatives: Creative[];
}

interface Stage {
  key: CampaignStatus;
  label: string;
}

const STAGES: Stage[] = [
  { key: "queued", label: "Queued — starting soon" },
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

/** Target variant count; matches `BRIEF_STYLES` in the backend brief service. */
const EXPECTED_VARIANT_COUNT = 3;

function isTerminal(status: CampaignStatus): boolean {
  return status === "done" || status === "failed";
}

function countReadyVariants(creatives: Creative[]): number {
  return creatives.filter((c) => c.final_url).length;
}

function countPaintedScenes(creatives: Creative[]): number {
  return creatives.filter((c) => c.background_url).length;
}

interface StageProgress {
  percent: number;
  detail: string;
}

/**
 * Derives in-stage progress from creative rows streamed via Realtime.
 * During `generating`, each inserted creative = one painted scene.
 * During `composing`, each creative with `final_url` = one finished poster.
 */
function getActiveStageProgress(
  status: CampaignStatus,
  creatives: Creative[],
): StageProgress | null {
  if (status === "generating") {
    const painted = countPaintedScenes(creatives);
    const clamped = Math.min(painted, EXPECTED_VARIANT_COUNT);
    const percent =
      clamped === 0 ? 5 : Math.round((clamped / EXPECTED_VARIANT_COUNT) * 100);
    return {
      percent: Math.min(percent, 100),
      detail: `${clamped} of ${EXPECTED_VARIANT_COUNT} scenes painted`,
    };
  }

  if (status === "composing") {
    const ready = countReadyVariants(creatives);
    const total = Math.max(creatives.length, EXPECTED_VARIANT_COUNT);
    const clamped = Math.min(ready, total);
    const percent = clamped === 0 ? 5 : Math.round((clamped / total) * 100);
    return {
      percent: Math.min(percent, 100),
      detail: `${clamped} of ${total} posters composed`,
    };
  }

  return null;
}

export function CampaignProgress({
  initialCampaign,
  initialCreatives,
}: CampaignProgressProps) {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [creatives, setCreatives] = useState<Creative[]>(initialCreatives);
  const [favoriteCreativeId, setFavoriteCreativeId] = useState<string | null>(
    initialCampaign.favorite_creative_id,
  );
  const [hasLiveUpdate, setHasLiveUpdate] = useState(false);
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

  const applyCampaignRow = useCallback((row: Campaign) => {
    setCampaign(row);
    setFavoriteCreativeId(row.favorite_creative_id ?? null);
    setHasLiveUpdate(true);
  }, []);

  const handleRegenerated = useCallback(() => {
    setCampaign((prev) => ({
      ...prev,
      status: "queued",
      error: null,
      favorite_creative_id: null,
    }));
    setCreatives([]);
    setFavoriteCreativeId(null);
    setHasLiveUpdate(true);
  }, []);

  const refreshCampaign = useCallback(async () => {
    const supabase = supabaseRef.current;
    const campaignId = initialCampaign.id;

    const { data: row } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    if (row) {
      applyCampaignRow(row as Campaign);
    }

    const { data: rows } = await supabase
      .from("creatives")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("variant_index", { ascending: true });
    if (rows) {
      setCreatives(rows as Creative[]);
      if (rows.length > 0) {
        setHasLiveUpdate(true);
      }
    }
  }, [applyCampaignRow, initialCampaign.id]);

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
            applyCampaignRow(payload.new as Campaign);
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
          if (!active) {
            return;
          }
          setHasLiveUpdate(true);
          if (
            payload.eventType === "DELETE" &&
            payload.old &&
            "id" in payload.old
          ) {
            setCreatives((prev) =>
              prev.filter((c) => c.id !== (payload.old as Creative).id),
            );
            return;
          }
          if (payload.new && "id" in payload.new) {
            mergeCreative(payload.new as Creative);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [applyCampaignRow, initialCampaign.id, mergeCreative]);

  // Immediate refresh on mount so progress appears before the first Realtime
  // event (or the 4s polling tick).
  useEffect(() => {
    void refreshCampaign();
  }, [refreshCampaign]);

  useEffect(() => {
    if (isTerminal(campaign.status)) {
      return;
    }

    const interval = setInterval(() => {
      void refreshCampaign();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [campaign.status, refreshCampaign]);

  const currentOrder = STATUS_ORDER[campaign.status];
  const readyCount = countReadyVariants(creatives);
  const stageProgress = getActiveStageProgress(campaign.status, creatives);
  const showVariantSkeleton =
    !isTerminal(campaign.status) &&
    (readyCount === 0 || (!hasLiveUpdate && campaign.status === "queued"));

  if (campaign.status === "failed") {
    return (
      <CampaignFailedState
        campaignId={campaign.id}
        error={campaign.error}
        onRegenerated={handleRegenerated}
      />
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
            const progress = active ? stageProgress : null;
            return (
              <li
                key={stage.key}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  active && "border-primary/40 bg-primary/5",
                  done && "border-border bg-muted/40 text-muted-foreground",
                  !active && !done && "border-border/60 text-muted-foreground",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <span className="block h-4 w-4 rounded-full border border-current" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="font-medium">
                      {stage.label}
                      {active && progress
                        ? ` — ${progress.percent}%`
                        : active
                          ? "…"
                          : ""}
                    </span>
                    {active && progress ? (
                      <>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {progress.detail}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : readyCount > 0 ? (
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Your {readyCount} variant{readyCount === 1 ? "" : "s"} ready.
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Generation finished, but no variants were produced. Start a new
          campaign to try again.
        </div>
      )}

      {showVariantSkeleton ? (
        <CampaignVariantsSkeleton />
      ) : (
        <CampaignVariants
          campaignId={campaign.id}
          creatives={creatives}
          favoriteCreativeId={favoriteCreativeId}
          onFavoriteChange={setFavoriteCreativeId}
        />
      )}
    </div>
  );
}
