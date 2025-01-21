// app/(private-layout)/chat/[id]/page.tsx
import prisma from "@/prisma/client";
import { notFound } from "next/navigation";
import { JsonMessagesArraySchema } from "@/types";
import ChatPageClient from "./ChatPageClient";

type PageParams = {
  params: { id: string };
};

export default async function ChatPageServer({ params: { id } }: PageParams) {
  // 1) Load from DB on the server
  const convo = await prisma.conversation.findUnique({
    where: { id },
  });
  if (!convo) {
    return notFound();
  }

  // 2) Parse messages if needed
  const messages = JsonMessagesArraySchema.parse(convo.messages);

  // 3) Pass data to our client component
  return <ChatPageClient id={id} messages={messages} />;
}
