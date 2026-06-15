"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProductPhoto } from "@/services/campaignApi";

export interface ProductPhotoUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ProductPhotoUploader({
  value,
  onChange,
  disabled,
}: ProductPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setUploading(true);
    try {
      const url = await uploadProductPhoto(file);
      onChange(url);
      toast.success("Product photo uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Product photo</Label>

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
          {value ? (
            <Image
              src={value}
              alt="Product"
              width={96}
              height={96}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {value ? "Replace photo" : "Upload photo"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={uploading || disabled}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, JPEG or WebP. A clean product shot works best.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
