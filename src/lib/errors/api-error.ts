import { NextResponse } from "next/server";

/**
 * Standard API error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  error: string;
  code?: ErrorCode;
  message?: string;
  details?: unknown;
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convert to NextResponse
   */
  toResponse(): NextResponse {
    return createErrorResponse(
      this.message,
      this.status,
      this.code,
      this.details,
    );
  }

  /**
   * Convert to raw Response (for streaming endpoints)
   */
  toRawResponse(): Response {
    const body: ApiErrorResponse = {
      error: this.message,
      code: this.code,
    };

    if (this.details) {
      body.details = this.details;
    }

    return new Response(JSON.stringify(body), {
      status: this.status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number,
  code?: ErrorCode,
  details?: unknown,
): NextResponse {
  const body: ApiErrorResponse = { error };

  if (code) {
    body.code = code;
  }
  if (details) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}

/**
 * Create error response from caught exception
 */
export function createErrorFromException(
  error: unknown,
  fallbackMessage: string,
  code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
): NextResponse {
  console.error(fallbackMessage, error);

  const message = error instanceof Error ? error.message : fallbackMessage;

  return createErrorResponse(fallbackMessage, 500, code, {
    message,
  });
}

/**
 * Pre-defined error responses
 */
export const Errors = {
  notFound: (resource: string) =>
    createErrorResponse(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),

  unauthorized: () =>
    createErrorResponse("Unauthorized", 401, ErrorCodes.AUTH_REQUIRED),

  forbidden: (message = "Forbidden") =>
    createErrorResponse(message, 403, ErrorCodes.FORBIDDEN),

  badRequest: (message: string, details?: unknown) =>
    createErrorResponse(message, 400, ErrorCodes.BAD_REQUEST, details),

  conflict: (message: string) =>
    createErrorResponse(message, 409, ErrorCodes.CONFLICT),

  payloadTooLarge: (message: string, details?: unknown) =>
    createErrorResponse(message, 413, ErrorCodes.PAYLOAD_TOO_LARGE, details),

  internalError: (message = "Internal server error", details?: unknown) =>
    createErrorResponse(message, 500, ErrorCodes.INTERNAL_ERROR, details),
} as const;
