import { Polar } from "@polar-sh/sdk";

import { env } from "./env";

let client: Polar | null = null;

/**
 * Whether real Polar billing credentials are configured. When false, checkout
 * creation is disabled and the API responds with a clear "not configured"
 * error instead of calling Polar with a placeholder token.
 */
export function isPolarConfigured(): boolean {
  const token = env.POLAR_ACCESS_TOKEN.trim().toLowerCase();
  return token.length > 0 && token !== "dummy";
}

/**
 * Returns a lazily-initialised Polar client bound to the configured server.
 */
export function getPolar(): Polar {
  if (!client) {
    client = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.POLAR_SERVER,
    });
  }
  return client;
}
