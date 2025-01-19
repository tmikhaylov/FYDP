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
  const [files, setFiles] = useState<File[]>([]);

  // 1) This function does the entire flow:
  //    upload file -> get upload_id -> /execute -> store Q&A in DB -> redirect
  async function uploadAndExecute(fileList: File[], message: string) {
    let uploadId: string | undefined;

    // If user attached a file, upload it to Flask
    if (fileList.length > 0) {
      const formData = new FormData();
      formData.append("file", fileList[0]); // just take the first for example
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("File upload failed");
      }
      const json = await res.json();
      uploadId = json.upload_id;
    }

    // Next, call /execute with { text, upload_id }
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

    // 2) (Optional) Store the conversation in your Next/Prisma DB
    // We'll do a simple example hitting a local Next route: /api/conversation
    // Then we can navigate to /chat/<id> or revalidate
    const storeRes = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: message,
        answer,
      }),
    });
    if (!storeRes.ok) {
      throw new Error("Storing conversation in DB failed");
    }
    const storeData = await storeRes.json();
    const conversationId = storeData.id;

    // Finally, redirect or revalidate
    router.push(`/chat/${conversationId}`);
  }

  // 2) The form's onSubmit
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get("message") as string;

    if (!message && files.length === 0) {
      return;
    }

    try {
      await uploadAndExecute(files, message);
      // Clear file list
      setFiles([]);
      // Optionally clear input (you can do that in a ref or something)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
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
          name="message"
          placeholder="Ask me something..."
          className="h-12 flex-grow"
        />
        <Submit />
      </div>

      {/* Display attached files */}
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
