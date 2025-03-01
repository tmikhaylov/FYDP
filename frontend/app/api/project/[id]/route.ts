import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const projectId = params.id;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: true,
        chats: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const projectId = params.id;
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "No name provided" }, { status: 400 });
    }
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
    return NextResponse.json({ project: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const projectId = params.id;
    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ message: "Project deleted" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
