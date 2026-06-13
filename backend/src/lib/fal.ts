import { fal } from "@fal-ai/client";

import { env } from "./env";

let configured = false;

/**
 * Returns the fal client, configuring credentials once.
 */
export function getFal(): typeof fal {
  if (!configured) {
    fal.config({ credentials: env.FAL_KEY });
    configured = true;
  }
  return fal;
}
