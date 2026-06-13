"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadLogo } from "@/services/brandApi";

export interface LogoUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      onChange(url);
      toast.success("Logo uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logo upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Logo</Label>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
          {value ? (
            <Image
              src={value}
              alt="Brand logo"
              width={80}
              height={80}
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
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {value ? "Replace logo" : "Upload logo"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, WebP or SVG. Max 5MB.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
