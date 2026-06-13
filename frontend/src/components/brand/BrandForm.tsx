"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBrand } from "@/app/(app)/brand/actions";
import type { Brand, BrandExtraction, BrandFormValues } from "@/types/brand";

import { LogoUploader } from "./LogoUploader";
import { PaletteEditor } from "./PaletteEditor";
import { UrlImportCard } from "./UrlImportCard";

export interface BrandFormProps {
  brand: Brand | null;
  redirectTo?: string;
  submitLabel?: string;
}

function toFormValues(brand: Brand | null): BrandFormValues {
  return {
    name: brand?.name ?? "",
    tone: brand?.tone ?? "",
    palette: brand?.palette ?? [],
    logoUrl: brand?.logo_url ?? null,
    sourceUrl: brand?.source_url ?? null,
  };
}

export function BrandForm({ brand, redirectTo, submitLabel }: BrandFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BrandFormValues>(toFormValues(brand));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function patch(next: Partial<BrandFormValues>): void {
    setValues((prev) => ({ ...prev, ...next }));
  }

  function handleImported(extraction: BrandExtraction, sourceUrl: string): void {
    patch({
      name: extraction.name,
      tone: extraction.tone,
      palette: extraction.palette,
      logoUrl: extraction.logo_candidate_url ?? values.logoUrl,
      sourceUrl,
    });
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      const result = await saveBrand({
        name: values.name,
        tone: values.tone,
        palette: values.palette,
        logoUrl: values.logoUrl,
        sourceUrl: values.sourceUrl,
      });

      if (!result.success) {
        setError(result.error ?? "Could not save brand");
        return;
      }

      toast.success("Brand saved");
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save brand");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <UrlImportCard onImported={handleImported} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">OR EDIT MANUALLY</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Acme Co."
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="brand-tone">Tone of voice</Label>
          <Input
            id="brand-tone"
            value={values.tone}
            onChange={(e) => patch({ tone: e.target.value })}
            placeholder="Playful and bold"
          />
        </div>

        <PaletteEditor
          value={values.palette}
          onChange={(palette) => patch({ palette })}
        />

        <LogoUploader
          value={values.logoUrl}
          onChange={(logoUrl) => patch({ logoUrl })}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={saving} className="self-start">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel ?? "Save brand"}
        </Button>
      </form>
    </div>
  );
}
