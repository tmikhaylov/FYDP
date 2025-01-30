// app/api/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { generateRandomId } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

type Message = {
  id: string;
  question: string;
  answer?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { question, answer } = await req.json();

    // name => if you want to use 'question' or some fallback
    const name = question || "New conversation";

    // Provide an explicit type
    const messages: Message[] = [];

    // Now create the conversation with an empty messages array
    const result = await prisma.conversation.create({
      data: {
        name,
        messages,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ id: result.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
