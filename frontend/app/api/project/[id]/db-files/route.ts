import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import prisma from "@/prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Enforce authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const projectId = params.id;
    const body = await req.json();
    const { upload_id, filename } = body;
    if (!upload_id || !filename) {
      return NextResponse.json({ error: "Missing upload_id or filename" }, { status: 400 });
    }
    // Insert file record into the database
    const fileRecord = await prisma.projectFile.create({
      data: {
        id: upload_id,
        filename,
        projectId,
      },
    });
    return NextResponse.json({ file: fileRecord }, { status: 200 });
  } catch (err: any) {
    console.error("DB File insert error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Enforce authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }
    // Delete file record from the database
    await prisma.projectFile.delete({ where: { id: fileId } });
    return NextResponse.json({ message: "File deleted from DB" }, { status: 200 });
  } catch (err: any) {
    console.error("DB File delete error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
