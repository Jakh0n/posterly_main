import { env } from "@/lib/env";

/**
 * Enqueues the async generation job on the backend worker. Returns true on a
 * 202 accept. Authenticated with a shared worker secret when configured.
 */
export async function enqueueGenerationJob(campaignId: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.WORKER_SECRET) {
      headers["x-worker-secret"] = process.env.WORKER_SECRET;
    }

    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/jobs/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ campaignId }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
