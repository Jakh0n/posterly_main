"use client";

import { useState, type FormEvent } from "react";

import { env } from "@/lib/env";

interface Brief {
  scene: string;
  lighting: string;
  color_palette: string[];
  mood: string;
  composition: string;
  camera: string;
  negative_prompt: string;
}

interface SpikeResult {
  brief: Brief;
  falImageUrl: string;
  image: string;
}

interface SpikeResponse {
  success: boolean;
  data?: SpikeResult;
  error?: { message: string };
}

export default function SpikePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpikeResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/spike`, {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as SpikeResponse;
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? `Request failed (${res.status})`);
      }

      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>/spike — product ad generator</h1>
      <p style={{ color: "#666" }}>
        Upload a product photo. Output = product-preserving ad + text overlay.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input type="file" name="photo" accept="image/*" required />
        <input name="productName" placeholder="Product name" required />
        <input name="price" placeholder="Price (e.g. $49)" required />
        <input name="promo" placeholder="Promo (e.g. 20% OFF)" required />
        <button type="submit" disabled={loading}>
          {loading ? "Generating…" : "Generate ad"}
        </button>
      </form>

      {error ? <p style={{ color: "red", marginTop: 16 }}>Error: {error}</p> : null}

      {result ? (
        <section style={{ marginTop: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.image} alt="Generated ad" style={{ width: "100%", border: "1px solid #ddd" }} />
          <h3 style={{ marginTop: 16 }}>Brief</h3>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(result.brief, null, 2)}
          </pre>
          <p style={{ fontSize: 12, color: "#666" }}>
            Raw fal image:{" "}
            <a href={result.falImageUrl} target="_blank" rel="noreferrer">
              {result.falImageUrl}
            </a>
          </p>
        </section>
      ) : null}
    </main>
  );
}
