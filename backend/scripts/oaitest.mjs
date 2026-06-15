import { readFileSync } from "node:fs";
import OpenAI from "openai";

const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = {};
for (const l of raw.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 40000,
  maxRetries: 0,
});

const imageUrl =
  "https://pub-45034329f8fb4d4cb7770a3078f8fee1.r2.dev/campaigns/products/9f46e5cc-a314-473d-9fb8-65c92c22e9eb.png";

try {
  const c = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return STRICT JSON only with keys scene, lighting, color_palette (array), mood, composition, camera, negative_prompt. JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Product name: Aurora Sneakers\nPrice: $49\nPromo: 20% OFF\nDesign the advertising brief. JSON only.",
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
  console.log("finish_reason:", c.choices[0]?.finish_reason);
  console.log("refusal:", c.choices[0]?.message?.refusal);
  console.log("content:", JSON.stringify(c.choices[0]?.message?.content));
} catch (e) {
  console.log("ERROR_STATUS", e.status, "CODE", e.code, "MSG", e.message);
}
