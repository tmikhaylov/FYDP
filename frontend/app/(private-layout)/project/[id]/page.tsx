// app/(private-layout)/project/[id]/page.tsx
import prisma from "@/prisma/client";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Navbar from "@/components/navbar";
import { ProjectFiles } from "@/components/project-files";
import { ChatList } from "@/components/chat-list";
import NewChatModal from "@/components/NewChatModal";
import React from "react";

type PageParams = {
  params: { id: string };
};

export default async function ProjectPage({ params: { id: projectId } }: PageParams) {
  const session = await getUser();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: true,
      chats: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return notFound();

  return (
    <>
      {/* Pass project info to Navbar so it shows "Project: ___" + new chat button */}
      <Navbar projectName={project.name} projectId={project.id} />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <div className="flex flex-row items-center gap-4">
          <ProjectFiles
            projectId={project.id}
            files={project.files.map((f) => ({ id: f.id, filename: f.filename }))}
          />
          <NewChatModal projectId={project.id} />
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Chats in this project</h2>
          <ChatList projectId={project.id} chats={project.chats} />
        </div>
      </div>
    </>
  );
}
