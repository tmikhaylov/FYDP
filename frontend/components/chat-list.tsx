"use client";

import Link from "next/link";
import { Conversation } from "@prisma/client";

export function ChatList({
  projectId,
  chats,
}: {
  projectId: string;
  chats: Conversation[];
}) {
  if (!chats || chats.length === 0) {
    return <p className="text-sm text-gray-500 mt-2">No chats yet</p>;
  }
  return (
    <div className="flex flex-col gap-2 mt-2">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          href={`/project/${projectId}/chat/${chat.id}`}
          className="underline text-sky-500"
        >
          {chat.name || "Untitled chat"}
        </Link>
      ))}
    </div>
  );
}
