// app/api/conversation/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    // 1) Grab the conversationId from the route
    const conversationId = params.id;

    // 2) Parse question + answer from JSON
    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    // 3) Find the existing conversation
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // 4) Append a new Q/A object
    const newId = generateRandomId(8);
    const updatedMessages = [
      ...(existing.messages as any[]),
      { id: newId, question, answer },
    ];

    // 5) Update conversation in DB
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messages: updatedMessages },
    });

    // 6) Return success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
