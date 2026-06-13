"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { extractBrand } from "@/services/brandApi";
import type { BrandExtraction } from "@/types/brand";

export interface UrlImportCardProps {
  onImported: (extraction: BrandExtraction, sourceUrl: string) => void;
}

export function UrlImportCard({ onImported }: UrlImportCardProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(): Promise<void> {
    if (!url.trim()) {
      setError("Paste your store URL first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const extraction = await extractBrand(url.trim());
      onImported(extraction, url.trim());
      toast.success("Brand details imported");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not import from that URL";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Import from your store
        </CardTitle>
        <CardDescription>
          Paste your store URL and we&apos;ll pull in your name, colors and tone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleImport();
                }
              }}
              placeholder="https://mystore.com"
              type="url"
              disabled={loading}
              aria-invalid={Boolean(error)}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <Button type="button" onClick={handleImport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
