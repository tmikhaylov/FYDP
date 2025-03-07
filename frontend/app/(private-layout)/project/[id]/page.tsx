import prisma from "@/prisma/client";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Navbar from "@/components/navbar";
import { ProjectFiles } from "@/components/project-files";
import { ChatList } from "@/components/chat-list";
import NewChatModal from "@/components/NewChatModal";
import LeftPanel from "@/components/left-panel";
import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the client-side rename component (no SSR)
const RenameProject = dynamic(() => import("./RenameProject"), { ssr: false });

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
      {/* Pass project info to Navbar */}
      <div className="sm:sticky bg-background sm:w-fit w-full sm:top-32 sm:mb-0 mb-4">
        <LeftPanel />
      </div>
      <Navbar projectName={project.name} projectId={project.id} />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Project header with name and edit icon */}
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <RenameProject projectId={project.id} currentName={project.name} />
        </div>
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
