import { NextResponse } from "next/server";
import { z } from "zod";
import { createErrorFromException, Errors } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validation/api-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return Errors.notFound("Conversation");
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return createErrorFromException(error, "Failed to fetch conversation");
  }
}

const UpdateConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title is too long"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();

    const validationResult = validateRequest(UpdateConversationSchema, body);
    if (validationResult instanceof NextResponse) return validationResult;

    const { title } = validationResult;

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    return createErrorFromException(error, "Failed to update conversation");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorFromException(error, "Failed to delete conversation");
  }
}
