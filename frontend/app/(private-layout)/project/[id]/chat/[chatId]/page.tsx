import prisma from "@/prisma/client";
import { notFound } from "next/navigation";
import { JsonMessagesArraySchema } from "@/types";
import ChatPageClient from "@/app/(private-layout)/chat/[id]/ChatPageClient";
import React from "react";

type PageParams = {
  params: { id: string; chatId: string };
};

export default async function ProjectChatPage({ params }: PageParams) {
  const { id, chatId } = params;
  const convo = await prisma.conversation.findUnique({
    where: { id: chatId },
  });
  if (!convo || convo.projectId !== id) {
    return notFound();
  }

  const messages = JsonMessagesArraySchema.parse(convo.messages);
  return <ChatPageClient id={chatId} messages={messages} />;
}
