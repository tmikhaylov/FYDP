"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { IoMdAttach } from "react-icons/io";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";

// Example message type
type Message = {
  id: string;
  question: string;
  answer?: string;
};

// Props from the server component
export default function ChatPageClient({
  id,
  messages,
}: {
  id: string;
  messages: Message[];
}) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Scrollable area for messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            <div className="font-semibold text-sky-500">{msg.question}</div>
            <div className="dark:text-slate-300 text-slate-900 whitespace-pre-wrap">
              {msg.answer || <em>No answer yet</em>}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky/fixed input at bottom */}
      <div className="sticky bottom-0 w-full border-t border-gray-300 dark:border-slate-700 bg-background p-4">
        <ChatInputExisting conversationId={id} />
      </div>
    </div>
  );
}

/** 
 * This is the same logic you had for uploading a file, calling /execute, 
 * patching /api/conversation/:id, etc.
 */
function ChatInputExisting({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function uploadAndExecute() {
    let uploadId: string | undefined;

    // 1) If a file is attached, upload it
    if (files.length > 0) {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("File upload failed");
      const data = await res.json();
      uploadId = data.upload_id;
    }

    // 2) /execute with text + uploadId
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

    // 3) Update conversation in DB
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

    // 4) Re‐fetch the page
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
        description: error.message || "Something went wrong",
      });
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFiles([ ...files, ...Array.from(e.target.files)]);
  }

  function removeFile(idx: number) {
    setFiles(files.filter((_, i) => i !== idx));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <span className="text-sm truncate max-w-[200px]">{f.name}</span>
              <button
                type="button"
                className="text-red-500 text-xl"
                onClick={() => removeFile(i)}
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
