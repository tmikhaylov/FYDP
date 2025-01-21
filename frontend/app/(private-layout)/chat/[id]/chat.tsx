"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";
import { IoMdAttach } from "react-icons/io";
import { useRouter } from "next/navigation";

// We'll define a default export "Chat" that your page.tsx can import
export default function Chat({
  id,
  messages,
}: {
  id: string;
  messages: {
    id: string;
    question: string;
    answer?: string;
  }[];
}) {
  return (
    <div className="space-y-6">
      {/* Render existing messages */}
      <div className="flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2">
            <div className="font-semibold text-sky-500">{msg.question}</div>
            <div className="dark:text-slate-300 text-slate-900 whitespace-pre-wrap">
              {msg.answer || <em>No answer yet</em>}
            </div>
          </div>
        ))}
      </div>

      {/* Our input for new messages */}
      <ChatInputExisting conversationId={id} />
    </div>
  );
}

// Named export for the input logic
export function ChatInputExisting({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function uploadAndExecute() {
    let uploadId: string | undefined;

    if (files.length > 0) {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("File upload failed");
      }
      const upData = await res.json();
      uploadId = upData.upload_id;
    }

    // /execute
    const execRes = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        upload_id: uploadId,
      }),
    });
    if (!execRes.ok) {
      const errData = await execRes.json().catch(() => ({}));
      throw new Error(errData.error || "Execute command failed");
    }
    const execData = await execRes.json();
    const answer = execData.output || "No answer";

    // Update conversation in DB
    const storeRes = await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: message,
        answer,
      }),
    });
    if (!storeRes.ok) {
      throw new Error("Updating conversation in DB failed");
    }

    // Re-fetch data on this page
    router.refresh();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message && files.length === 0) return;

    try {
      await uploadAndExecute();
      setMessage("");
      setFiles([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
      });
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:pr-5">
      <div className="flex items-center gap-2">
        <label className="flex items-center justify-center h-12 w-12 text-xl text-sky-500 cursor-pointer">
          <IoMdAttach />
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <Input
          autoComplete="off"
          placeholder="Ask me something..."
          className="h-12 flex-grow"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Submit />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg"
            >
              <span className="text-sm truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-red-500 text-xl"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
