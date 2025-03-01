// app/api/conversation/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const conversationId = params.id;

    // Now parse attachments as well
    const { question, answer, attachments } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    // 1) Find the existing conversation
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // 2) Append a new Q/A object with attachments if any
    const newId = generateRandomId(8);
    const updatedMessages = [
      ...(existing.messages as any[]),
      {
        id: newId,
        question,
        answer,
        // attachments can be undefined or an array of strings
        attachments: attachments && Array.isArray(attachments) ? attachments : [],
      },
    ];

    // 3) Update conversation in DB
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messages: updatedMessages },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
