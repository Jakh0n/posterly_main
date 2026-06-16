import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI providers
  OPENAI_API_KEY: z.string().min(1),

  // Cloudflare R2 storage
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Polar billing
  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_WEBHOOK_SECRET: z.string().min(1),
  // Which Polar environment the access token belongs to.
  POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
  // Polar product ids per billing pack (optional until billing is configured).
  POLAR_PRODUCT_CREDITS_S: z.string().optional(),
  POLAR_PRODUCT_CREDITS_M: z.string().optional(),
  POLAR_PRODUCT_CREDITS_L: z.string().optional(),
  POLAR_PRODUCT_LITE: z.string().optional(),
  POLAR_PRODUCT_PRO: z.string().optional(),
  POLAR_PRODUCT_STUDIO: z.string().optional(),

  // Public base URL of the frontend, used for checkout success/cancel redirects.
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Shared secret required to enqueue generation jobs from the frontend.
  // Optional in development; set it in production to lock down /jobs/generate.
  WORKER_SECRET: z.string().optional(),

  // When true, the image step renders a local placeholder instead of calling
  // OpenAI. Dev/test only.
  MOCK_GENERATION: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
