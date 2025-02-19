// app/api/conversation/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const conversationId = params.id;
    const { question, answer, attachments } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    const existing = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const newId = generateRandomId(8);
    const updatedMessages = [
      ...(existing.messages as any[]),
      {
        id: newId,
        question,
        answer,
        // store attachments in the new message
        attachments: attachments || [],
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
