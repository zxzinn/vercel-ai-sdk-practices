import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validation/api-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Parse and validate limit parameter
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit =
      Number.isNaN(parsedLimit) || parsedLimit < 1
        ? 50 // Default to 50 if invalid
        : Math.min(parsedLimit, 100); // Cap at 100 to prevent performance issues

    const conversations = await prisma.conversation.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

const CreateConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title is too long")
    .trim(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = validateRequest(CreateConversationSchema, body);
    if (validationResult instanceof NextResponse) return validationResult;

    const { title, userId } = validationResult;

    const conversation = await prisma.conversation.create({
      data: {
        title,
        userId: userId || null,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
