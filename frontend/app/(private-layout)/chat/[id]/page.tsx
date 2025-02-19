// app/(private-layout)/chat/[id]/page.tsx
import prisma from "@/prisma/client";
import { notFound } from "next/navigation";
import { JsonMessagesArraySchema } from "@/types";
import ChatPageClient from "./ChatPageClient";

type PageParams = {
  params: { id: string };
};

export default async function ChatPageServer({ params: { id } }: PageParams) {
  // find the conversation
  const convo = await prisma.conversation.findUnique({
    where: { id },
  });
  if (!convo) return notFound();

  // parse the stored JSON
  const messages = JsonMessagesArraySchema.parse(convo.messages);
  // (The schema should allow { attachments?: string[] })

  // pass to client
  return <ChatPageClient id={id} messages={messages} />;
}
