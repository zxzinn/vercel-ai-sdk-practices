import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 },
    );
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

    const validation = UpdateConversationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { title } = validation.data;

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to update conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
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
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
