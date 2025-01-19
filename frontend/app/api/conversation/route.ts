// app/api/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    const newConversationId = generateRandomId(8);
    const newMessages = [
      {
        id: newConversationId,
        question,
        answer,
      },
    ];

    const dataRef = await prisma.conversation.create({
      data: {
        messages: newMessages,
        name: question, // or whatever you like
        userId: "someUserId", // adjust for your auth
      },
    });

    return NextResponse.json({ id: dataRef.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}