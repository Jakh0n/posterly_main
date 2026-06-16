"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCampaign,
  regenerateCampaign,
} from "@/app/(app)/campaigns/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CampaignStatus } from "@/types/campaign";

export interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
  onRegenerated?: () => void;
}

export function CampaignActions({
  campaignId,
  status,
  onRegenerated,
}: CampaignActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, startDelete] = useTransition();
  const [pendingRegenerate, startRegenerate] = useTransition();

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteCampaign(campaignId);
      if (result?.error) {
        toast.error(result.error);
        setDeleteOpen(false);
      }
    });
  };

  const handleRegenerate = () => {
    startRegenerate(async () => {
      const result = await regenerateCampaign(campaignId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onRegenerated?.();
      toast.success("Regeneration started.");
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "failed" ? (
          <Button
            type="button"
            disabled={pendingRegenerate}
            onClick={handleRegenerate}
          >
            {pendingRegenerate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              This permanently removes the campaign and all generated variants.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pendingDelete}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingDelete}
              onClick={handleDelete}
            >
              {pendingDelete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
