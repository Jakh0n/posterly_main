import { apiFetch } from "@/lib/api";

export interface HealthStatus {
  status: "ok";
  uptime: number;
  timestamp: string;
}

/**
 * Checks the Express API health endpoint.
 */
export async function getApiHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/api/v1/health");
}
