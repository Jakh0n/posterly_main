import { apiFetch } from "@/lib/api";
import { env } from "@/lib/env";
import type { BrandExtraction } from "@/types/brand";

/**
 * Calls the Express API to scrape + normalize a store URL into a brand profile.
 * Browser-safe.
 */
export async function extractBrand(url: string): Promise<BrandExtraction> {
  return apiFetch<BrandExtraction>("/api/v1/brand/extract", {
    method: "POST",
    body: { url },
  });
}

interface LogoUploadResponse {
  success: boolean;
  data?: { url: string };
  error?: { message: string };
}

/**
 * Uploads a logo file to the Express API (R2-backed) and returns its public URL.
 * Browser-safe.
 */
export async function uploadLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("logo", file);

  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/brand/logo`, {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json()) as LogoUploadResponse;
  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Logo upload failed");
  }

  return payload.data.url;
}
