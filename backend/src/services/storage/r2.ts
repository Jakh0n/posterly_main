import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../../lib/env";
import { HttpError } from "../../lib/httpError";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function buildPublicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Uploads a buffer to R2 under the given prefix and returns its public URL.
 */
export async function uploadObject(
  file: Buffer,
  mimeType: string,
  prefix = "uploads",
): Promise<UploadResult> {
  try {
    const extension = EXTENSION_BY_MIME[mimeType] ?? "bin";
    const key = `${prefix}/${randomUUID()}.${extension}`;

    await getClient().send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    return { key, url: buildPublicUrl(key) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    throw HttpError.internal(`Failed to upload to storage: ${message}`);
  }
}
