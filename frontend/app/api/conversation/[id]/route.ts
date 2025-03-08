import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const conversationId = params.id;
    const body = await req.json();

    // If the request includes a "name", perform a rename operation.
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "Invalid conversation name" }, { status: 400 });
      }
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { name: body.name.trim() },
      });
      return NextResponse.json({ conversation: updatedConversation }, { status: 200 });
    }

    // Otherwise, assume it's the original Q/A update.
    const { question, answer, attachments } = body;
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    // Find the existing conversation.
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Append the new Q/A message (preserving any previous messages).
    const newId = generateRandomId(8);
    const updatedMessages = [
      ...(existing.messages as any[] || []),
      {
        id: newId,
        question,
        answer,
        attachments: attachments && Array.isArray(attachments) ? attachments : [],
      },
    ];

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messages: updatedMessages },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const conversationId = params.id;
    // Verify the conversation exists.
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });
    return NextResponse.json({ message: "Conversation deleted" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
