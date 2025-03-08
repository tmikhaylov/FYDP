"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Conversation } from "@prisma/client";
import { SlOptions } from "react-icons/sl";
import { RiDeleteBin5Line } from "react-icons/ri";
import { MdOutlineModeEdit } from "react-icons/md";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

function cn(...classes: (string | boolean | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function ChatList({
  projectId,
  chats,
}: {
  projectId: string;
  chats: Conversation[];
}) {
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameChatName, setRenameChatName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Track which chat's dropdown is open
  const [openDropdownChatId, setOpenDropdownChatId] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const handleOpenRename = (chatId: string, currentName: string) => {
    setRenameChatId(chatId);
    setRenameChatName(currentName);
    setShowRenameModal(true);
  };

  const handleRenameChat = async () => {
    if (!renameChatId || !renameChatName.trim()) {
      toast({ title: "Error", description: "Chat name cannot be empty" });
      return;
    }
    try {
      const res = await fetch(`/api/conversation/${renameChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameChatName.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to rename chat");
      }
      setShowRenameModal(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error renaming chat:", error.message);
      toast({ title: "Error", description: error.message });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/conversation/${chatId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete chat");
      }
      router.refresh();
    } catch (error: any) {
      console.error("Error deleting chat:", error.message);
      toast({ title: "Error", description: error.message });
    }
  };

  if (!chats || chats.length === 0) {
    return <p className="text-sm text-gray-500 mt-2">No chats yet</p>;
  }

  return (
    <>
      {/* Container for the list of chats */}
      <div className="flex flex-col w-full gap-2 mt-2">
        {chats.map((chat) => {
          const isDropdownOpen = openDropdownChatId === chat.id;

          return (
            <div
              key={chat.id}
              // Make each row a fixed width if desired, clickable, highlight if dropdown is open or hovered
              onClick={() => router.push(`/project/${projectId}/chat/${chat.id}`)}
              className={cn(
                "group w-[36rem] flex items-center justify-between px-3 py-2 rounded transition-colors cursor-pointer",
                isDropdownOpen
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <span className="text-sky-600 truncate max-w-[90%]">
                {chat.name || "Untitled chat"}
              </span>

              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={(open) => {
                  setOpenDropdownChatId(open ? chat.id : null);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "ml-2 text-gray-500 hover:text-gray-700 transition-opacity",
                      isDropdownOpen
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      // Prevent the row's onClick from firing
                      e.stopPropagation();
                    }}
                  >
                    <SlOptions size={16} />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuItem
                    className="cursor-pointer text-gray-400 dark:text-gray-100"
                    onClick={(e) => {
                      e.stopPropagation(); // don't navigate
                      setOpenDropdownChatId(null); // close the dropdown
                      handleOpenRename(chat.id, chat.name || "");
                    }}
                  >
                    <MdOutlineModeEdit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500"
                    onClick={(e) => {
                      e.stopPropagation(); // don't navigate
                      setOpenDropdownChatId(null); // close the dropdown
                      handleDeleteChat(chat.id);
                    }}
                  >
                    <RiDeleteBin5Line className="mr-2 h-4 w-4 text-red-500" />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Rename Chat Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Modal backdrop */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowRenameModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg p-4 w-80">
            <h2 className="text-lg font-semibold mb-2">Rename Chat</h2>
            <Input
              placeholder="Enter new chat name"
              value={renameChatName}
              onChange={(e) => setRenameChatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameChat();
                }
              }}
            />
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-10 py-2 bg-gray-300 dark:bg-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameChat}
                className="px-10 py-2 bg-blue-600 text-white rounded hover:bg-sky-500"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
