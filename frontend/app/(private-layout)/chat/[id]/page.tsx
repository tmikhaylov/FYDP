import prisma from "@/prisma/client";
import { notFound } from "next/navigation";
import { JsonMessagesArraySchema } from "@/types";
import ChatPageClient from "./ChatPageClient";

type PageParams = {
  params: { id: string };
};

export default async function ChatPageServer({ params: { id } }: PageParams) {
  const convo = await prisma.conversation.findUnique({ where: { id } });
  if (!convo) return notFound();

  const messages = JsonMessagesArraySchema.parse(convo.messages);
  return <ChatPageClient id={id} messages={messages} />;
}
