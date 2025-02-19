"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { IoMdAttach } from "react-icons/io";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";
import { generateRandomId } from "@/lib/utils";

// We'll store attachments in each message's "attachments" array.
type Message = {
  id: string;
  question: string;
  answer?: string;
  attachments?: string[];
};

export default function NewChatPageClient() {
  const router = useRouter();
  const { toast } = useToast();

  // For brand-new conversation, start with a "welcome" message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      question: "How can I help you today?",
      answer: undefined,
      attachments: [],
    },
  ]);

  // form states
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Fake progress
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isLoading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((p) => (p < 100 ? p + 5 : 100));
      }, 200);
    } else {
      setProgress(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // 1) Show user bubble w/ "Thinking..." and attachments
  function addLocalThinkingBubble(question: string, fileNames: string[]) {
    const tempId = generateRandomId(8);
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        question,
        answer: "Thinking...",
        attachments: fileNames,
      },
    ]);
    return tempId;
  }

  // 2) Once server returns final answer, update that bubble
  function updateLocalAnswer(tempId: string, finalAnswer: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, answer: finalAnswer } : m))
    );
  }

  // Step A: create conversation in DB
  async function createConversation(): Promise<string> {
    // Your /api/conversation route must allow 
    // "question": null, "answer": null or an empty array
    const res = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: null, answer: null }),
    });
    if (!res.ok) {
      throw new Error("Failed to create conversation in DB");
    }
    const data = await res.json();
    return data.id;
  }

  // Step B: upload the file if any
  async function uploadFile(conversationId: string, file: File) {
    const formData = new FormData();
    formData.append("conversation_id", conversationId);
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("File upload failed");
    const json = await res.json();
    return json.upload_id as string;
  }

  // Step C: call /execute
  async function callExecute(text: string, uploadId?: string) {
    if (!uploadId) {
      // no-file => simulate
      return `Simulated response. You said: ${text}`;
    }
    const execRes = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, upload_id: uploadId }),
    });
    if (!execRes.ok) {
      const e = await execRes.json().catch(() => ({}));
      throw new Error(e.error || "Execute command failed");
    }
    const execJson = await execRes.json();
    return execJson.output || "No answer";
  }

  // Step D: patch conversation w/ final Q/A + attachments
  async function patchConversation(
    conversationId: string,
    q: string,
    a: string,
    attachments: string[]
  ) {
    const patch = await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, answer: a, attachments }),
    });
    if (!patch.ok) {
      throw new Error("Failed to patch conversation with Q/A & attachments");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message && files.length === 0) return;

    // show user bubble immediately
    const fileNames = files.map((f) => f.name);
    const tempId = addLocalThinkingBubble(message, fileNames);

    try {
      setIsLoading(true);

      // create conv
      const conversationId = await createConversation();

      // upload if file
      let uploadId: string | undefined;
      if (files.length > 0) {
        uploadId = await uploadFile(conversationId, files[0]);
      }

      // /execute => final answer
      const finalAnswer = await callExecute(message, uploadId);

      // patch DB
      await patchConversation(conversationId, message, finalAnswer, fileNames);

      // update local bubble
      updateLocalAnswer(tempId, finalAnswer);

      // clear
      setMessage("");
      setFiles([]);

      // navigate to /chat/[id]
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Something went wrong",
      });
      updateLocalAnswer(tempId, "Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    // IMPORTANT: "flex flex-col h-screen" so we can pin the input
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            {/* Right-aligned user bubble */}
            <div className="flex flex-col items-end">
              {/* Attachments above bubble */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-1 justify-end">
                  {msg.attachments.map((filename, idx) => (
                    <div
                      key={idx}
                      className="
                        bg-white dark:bg-slate-600 
                        text-sm text-black dark:text-white 
                        px-2 py-1 
                        rounded border border-gray-300 dark:border-slate-500
                        max-w-[200px]
                        truncate
                      "
                      title={filename}
                    >
                      📎 {filename}
                    </div>
                  ))}
                </div>
              )}
              <div
                className="
                  bg-sky-500 text-white
                  px-4 py-2 max-w-[70%]
                  rounded-xl rounded-br-none
                  whitespace-pre-wrap
                "
              >
                {msg.question}
              </div>
            </div>

            {/* If answered, show left bubble */}
            {msg.answer && (
              <div className="flex justify-start mt-2">
                <div
                  className="
                    bg-gray-200 dark:bg-gray-700
                    text-black dark:text-white
                    px-4 py-2 
                    max-w-[70%] rounded-xl
                    rounded-bl-none
                    whitespace-pre-wrap
                  "
                >
                  {msg.answer}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fake progress bar if loading */}
      {isLoading && (
        <div className="bg-gray-300 h-2 w-full">
          <div
            className="bg-sky-500 h-2"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* The pinned input at bottom */}
      <div className="p-4 border-t border-gray-300 dark:border-slate-700">
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
            <Submit disabled={isLoading} />
          </div>

          {/* Show attached files below input */}
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
      </div>
    </div>
  );
}
