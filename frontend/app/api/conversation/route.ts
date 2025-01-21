// app/api/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";

// 1) Import getServerSession & your authConfig
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 2) Get the session
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 3) Parse question + answer
    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // 4) Build messages array
    const newConversationId = generateRandomId(8);
    const messages = [{ id: newConversationId, question, answer }];

    // 5) Actually create the conversation
    const result = await prisma.conversation.create({
      data: {
        name: question,
        messages,
        userId: session.user.id, // <-- Real user ID from your DB
      },
    });

    return NextResponse.json({ id: result.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
