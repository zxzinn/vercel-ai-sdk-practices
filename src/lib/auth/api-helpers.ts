import { NextResponse } from "next/server";
import { Errors } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "./server";

/**
 * Requires authentication and returns userId
 * Returns error response if not authenticated
 */
export async function requireAuth(): Promise<
  { userId: string } | NextResponse
> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Errors.unauthorized();
  }

  return { userId };
}

/**
 * Requires authentication and space ownership
 * Returns error response if not authenticated or space not found/owned
 */
export async function requireSpaceAccess(
  spaceId: string,
): Promise<
  { userId: string; space: { id: string; userId: string } } | NextResponse
> {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  const space = await prisma.space.findFirst({
    where: { id: spaceId, userId },
    select: { id: true, userId: true },
  });

  if (!space) {
    return Errors.notFound("Space");
  }

  return { userId, space };
}
