import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "50", 10),
      100, // Maximum limit to prevent performance issues
    );

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, userId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

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
