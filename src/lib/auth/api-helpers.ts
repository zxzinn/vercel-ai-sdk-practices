import { NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: "Space not found", code: "SPACE_NOT_FOUND" },
      { status: 404 },
    );
  }

  return { userId, space };
}
