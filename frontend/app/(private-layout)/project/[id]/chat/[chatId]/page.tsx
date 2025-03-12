// app/(private-layout)/project/[id]/chat/[chatId]/page.tsx
import prisma from "@/prisma/client";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { JsonMessagesArraySchema } from "@/types";
import LeftPanel from "@/components/left-panel";
import ChatPage from "@/components/ChatPage";
import Navbar from "@/components/navbar";

type PageParams = {
  params: { id: string; chatId: string };
};

export default async function ProjectChatPage({ params }: PageParams) {
  const { id: projectId, chatId } = params;
  const session = await getUser();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch the conversation
  const convo = await prisma.conversation.findUnique({
    where: { id: chatId },
  });
  if (!convo || convo.projectId !== projectId) {
    return notFound();
  }

  // Also fetch the project to get its name
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    return notFound();
  }

  const messages = JsonMessagesArraySchema.parse(convo.messages);

  return (
    <>
      <div className="sm:sticky bg-background sm:w-fit w-full sm:top-32 sm:mb-0 mb-4">
        <LeftPanel />
      </div>
      {/* "Project: ___ | Chat: ___" */}
      <Navbar
        projectId={project.id}
        projectName={project.name}
        chatName={convo.name}
      />
      <ChatPage projectId={projectId} chatId={chatId} initialMessages={messages} />
    </>
  );
}
