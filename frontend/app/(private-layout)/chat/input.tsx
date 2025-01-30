"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";
import { IoMdAttach } from "react-icons/io";
import { useRouter } from "next/navigation";

export default function ChatInput() {
  const router = useRouter();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // 1) Create conversation in DB -- but no Q/A yet, just an empty array
  async function createConversationInDB() {
    // We'll pass either an empty message or no question/answer for now
    const storeRes = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // If your route requires question/answer, remove them or supply placeholders.
      body: JSON.stringify({
        question: null, // or ""
        answer: null,
      }),
    });
    if (!storeRes.ok) throw new Error("Storing conversation in DB failed");
    const storeData = await storeRes.json();
    return storeData.id; // conversationId
  }

  // 2) Upload file if any
  async function uploadFile(conversationId: string, file: File) {
    const formData = new FormData();
    formData.append("conversation_id", conversationId);
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error("File upload failed");
    }
    const data = await res.json();
    return data.upload_id;
  }

  // 3) Call /execute to get the real answer
  async function callExecute(text: string, uploadId: string | undefined) {
    if (!uploadId) {
      // No file scenario - purely optional
      return `Simulated no-file answer: You said: ${text}`;
    }
    const execRes = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        upload_id: uploadId,
      }),
    });
    if (!execRes.ok) {
      const errData = await execRes.json().catch(() => ({}));
      throw new Error(errData.error || "Execute command failed");
    }
    const execData = await execRes.json();
    return execData.output || "No answer";
  }

  // 4) Patch conversation with final Q/A
  async function patchConversation(conversationId: string, question: string, answer: string) {
    const patchRes = await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        answer,
      }),
    });
    if (!patchRes.ok) {
      throw new Error("Failed to update conversation with final answer");
    }
  }

  // 5) The main onSubmit
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message && files.length === 0) return;

    try {
      // (a) Create conversation with empty messages
      const conversationId = await createConversationInDB();

      // (b) If file is attached, upload it => get uploadId
      let uploadId: string | undefined;
      if (files.length > 0) {
        uploadId = await uploadFile(conversationId, files[0]);
      }

      // (c) Call /execute to get final answer
      const finalAnswer = await callExecute(message, uploadId);

      // (d) Patch conversation with the real Q/A
      await patchConversation(conversationId, message, finalAnswer);

      // (e) Navigate to the new conversation
      router.push(`/chat/${conversationId}`);

      // Clear UI
      setMessage("");
      setFiles([]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Something went wrong",
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
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg"
            >
              <span className="text-sm truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
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
