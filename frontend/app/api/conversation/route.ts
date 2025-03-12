import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { projectId, name } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const chat = await prisma.conversation.create({
      data: {
        name: name || "Untitled",
        messages: [],
        projectId,
      },
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
