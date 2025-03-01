// app/api/project/[id]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/prisma/client";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const UPLOAD_FOLDER = "C:/tmp/uploads"; // adjust as needed

export async function POST(req: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const projectId = params.id;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileId = uuidv4();
    const safeFilename = file.name.replace(/[^\w.]/g, "_");
    const finalFilename = `${fileId}_${safeFilename}`;
    const fullPath = path.join(UPLOAD_FOLDER, finalFilename);
    fs.writeFileSync(fullPath, buffer);

    const projectFile = await prisma.projectFile.create({
      data: {
        filename: finalFilename,
        projectId,
      },
    });

    return NextResponse.json({ file: projectFile }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
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
    const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    await prisma.projectFile.delete({ where: { id: fileId } });
    const filePath = path.join(UPLOAD_FOLDER, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ message: "File deleted" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
