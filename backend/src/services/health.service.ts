export interface HealthStatus {
  status: "ok";
  uptime: number;
  timestamp: string;
}

/**
 * Returns the current liveness status of the API process.
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
