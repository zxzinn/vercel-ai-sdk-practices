import type { NextResponse } from "next/server";
import type { z } from "zod";
import { createErrorResponse, ErrorCodes } from "@/lib/errors/api-error";

/**
 * Validates request body against a Zod schema
 * Returns parsed data or NextResponse error
 *
 * @example
 * const result = validateRequest(CreateSpaceSchema, body);
 * if (result instanceof NextResponse) return result;
 * const { name, description } = result; // Type-safe parsed data
 */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> | NextResponse {
  const validation = schema.safeParse(body);

  if (!validation.success) {
    return createErrorResponse(
      "Invalid request body",
      400,
      ErrorCodes.VALIDATION_ERROR,
      validation.error.issues,
    );
  }

  return validation.data;
}

/**
 * Validates request body and returns raw Response (for streaming endpoints)
 * Returns parsed data or Response error
 *
 * @example
 * const result = validateRequestRaw(RequestBodySchema, body);
 * if (result instanceof Response) return result;
 * const { messages, model } = result;
 */
export function validateRequestRaw<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> | Response {
  const validation = schema.safeParse(body);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        code: ErrorCodes.VALIDATION_ERROR,
        details: validation.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return validation.data;
}
