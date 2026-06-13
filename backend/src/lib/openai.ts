import OpenAI from "openai";

import { env } from "./env";

let client: OpenAI | null = null;

/**
 * Returns a lazily-initialised OpenAI client.
 */
export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}
