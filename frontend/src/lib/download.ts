import { env } from "@/lib/env";

/**
 * Triggers a browser download for a campaign asset via the backend proxy (avoids
 * R2 CORS). Browser-safe.
 */
export function downloadCampaignAsset(url: string, filename: string): void {
  const params = new URLSearchParams({ url, filename });
  const href = `${env.NEXT_PUBLIC_API_URL}/api/v1/campaigns/download?${params}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
