/**
 * Application-level error carrying an HTTP status code. Thrown from controllers
 * and services, then translated into a JSON response by the error handler.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", details?: unknown): HttpError {
    return new HttpError(400, message, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized"): HttpError {
    return new HttpError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden"): HttpError {
    return new HttpError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Not found"): HttpError {
    return new HttpError(404, message, "NOT_FOUND");
  }

  static internal(message = "Internal server error"): HttpError {
    return new HttpError(500, message, "INTERNAL_ERROR");
  }
}
