// app/api/project/[id]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// If you want to enforce authentication:
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";

// Import your Prisma client instance
import prisma from "@/prisma/client";

// 1) Next.js 13 Node runtime (replaces older “config = { runtime: "nodejs" }”)
export const runtime = "nodejs";

// 2) Optionally force dynamic => ensures the route is always run on server
// export const dynamic = "force-dynamic";

const UPLOAD_FOLDER = "C:/tmp/uploads";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // If you want auth:
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const projectId = params.id;

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Convert file => Buffer => write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileId = uuidv4();
    const safeFilename = file.name.replace(/[^\w.]/g, "_");
    const finalFilename = `${fileId}_${safeFilename}`;

    const fullPath = path.join(UPLOAD_FOLDER, finalFilename);
    fs.writeFileSync(fullPath, buffer);

    // Insert DB record
    const projectFile = await prisma.projectFile.create({
      data: {
        filename: finalFilename,
        projectId,
      },
    });

    return NextResponse.json({ file: projectFile }, { status: 200 });
  } catch (err: any) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // If you want auth:
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "No fileId param" }, { status: 400 });
    }

    // Find the record
    const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Remove DB record
    await prisma.projectFile.delete({ where: { id: fileId } });

    // Remove from disk
    const filePath = path.join(UPLOAD_FOLDER, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ message: "File deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("File delete error:", err);
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
