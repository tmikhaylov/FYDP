// app/(private-layout)/project/[id]/chat/[chatId]/page.tsx
import prisma from "@/prisma/client";
import { notFound } from "next/navigation";
import ChatPage from "@/components/ChatPage";
import { JsonMessagesArraySchema } from "@/types";
import React from "react";

type PageParams = {
  params: { id: string; chatId: string };
};

export default async function ProjectChatPage({ params }: PageParams) {
  const { id: projectId, chatId } = params;
  const convo = await prisma.conversation.findUnique({
    where: { id: chatId },
  });
  if (!convo || convo.projectId !== projectId) {
    return notFound();
  }
  const messages = JsonMessagesArraySchema.parse(convo.messages);
  return <ChatPage projectId={projectId} chatId={chatId} initialMessages={messages} />;
}
