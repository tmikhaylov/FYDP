import prisma from "@/prisma/client";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ProjectFiles } from "@/components/project-files";
import { ChatList } from "@/components/chat-list";
import NewChatButton from "@/components/new-chat-button";
import React from "react";

type PageParams = {
  params: { id: string };
};

export default async function ProjectPage({ params: { id } }: PageParams) {
  const session = await getUser();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      files: true,
      chats: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return notFound();

  // Optionally check ownership: if (project.userId !== session.user.id) notFound()

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">{project.name}</h1>

      <div className="flex flex-row items-center gap-4">
        <ProjectFiles projectId={project.id} files={project.files} />
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
        >
          Add instructions
        </button>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">Chats in this project</h2>
        <ChatList projectId={project.id} chats={project.chats} />
      </div>

      <NewChatButton projectId={project.id} />
    </div>
  );
}
