"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "./ui/button";
import { useToast } from "./ui/use-toast";

export default function NewChatModal({ projectId }: { projectId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [chatName, setChatName] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function handleCreateChat() {
    if (!chatName.trim()) {
        toast({ title: "Error", description: "Chat name cannot be empty" });
        return;
    }
    if (!projectId) {
        toast({ title: "Error", description: "Chat has to be inside a project" });
        return;
    }
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: chatName }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + err.error);
        return;
      }
      const data = await res.json();
      router.push(`/project/${projectId}/chat/${data.chat.id}`);
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className={buttonVariants({ variant: "link", size: "sm" })}>
        New chat
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Create a New Chat</h2>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateChat();
                }
              }}
              placeholder="Chat name"
              className="w-full mb-4 p-2 rounded border dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-400">
                Cancel
              </button>
              <button onClick={handleCreateChat} className="px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-500">
                Create Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
