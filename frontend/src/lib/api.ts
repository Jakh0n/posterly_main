import { env } from "@/lib/env";
import type { ApiResponse } from "@/types";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Typed fetch wrapper for the Express API. Always returns the unwrapped data
 * payload or throws an `ApiRequestError` with a consistent shape.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !payload.success) {
      const error = payload.success
        ? { message: response.statusText }
        : payload.error;

      throw new ApiRequestError(
        error.message,
        response.status,
        "code" in error ? error.code : undefined,
        "details" in error ? error.details : undefined,
      );
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    throw new ApiRequestError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  }
}
