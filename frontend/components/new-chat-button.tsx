// components/new-chat-button.tsx
"use client";

import { useState } from "react";

export default function NewChatButton({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + err.error);
        return;
      }
      const data = await res.json();
      window.location.href = `/project/${projectId}/chat/${data.chat.id}`;
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-md font-semibold mb-2">New chat in this project</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chat name..."
        className="p-2 rounded border dark:bg-gray-800 dark:text-white mr-2"
      />
      <button
        onClick={handleCreate}
        className="px-3 py-1 bg-sky-500 text-white rounded"
      >
        Create
      </button>
    </div>
  );
}
