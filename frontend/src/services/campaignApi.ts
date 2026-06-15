import { env } from "@/lib/env";

interface UploadResponse {
  success: boolean;
  data?: { url: string };
  error?: { message: string };
}

/**
 * Uploads a product photo to the Express API (R2-backed) and returns its
 * public URL. Browser-safe.
 */
export async function uploadProductPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/campaigns/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json()) as UploadResponse;
  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Product photo upload failed");
  }

  return payload.data.url;
}
