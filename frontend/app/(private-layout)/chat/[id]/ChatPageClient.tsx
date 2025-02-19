"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { IoMdAttach } from "react-icons/io";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";
import { generateRandomId } from "@/lib/utils";

// Now the `Message` type includes an optional `attachments` array of string
type Message = {
  id: string;
  question: string;
  answer?: string;
  attachments?: string[];
};

export default function ChatPageClient({
  id,
  messages: serverMessages,
}: {
  id: string;
  messages: Message[];
}) {
  // We keep a local copy of messages for optimistic UI
  const [messages, setMessages] = useState<Message[]>(serverMessages);

  /**
   * Called by the input component to create a "thinking" bubble
   * with the user's question and any file name attachments.
   */
  function handleNewMessage(question: string, fileNames: string[]): string {
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

  /**
   * When the server returns a final answer, update that bubble
   */
  function handleUpdateAnswer(tempId: string, finalAnswer: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, answer: finalAnswer } : m
      )
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            {/* USER BUBBLE: right-aligned */}
            <div className="flex flex-col items-end">
              {/* If there are attachments, display them above the bubble */}
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

            {/* AI bubble: left-aligned */}
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

      {/* Sticky/fixed input at bottom */}
      <div className="sticky bottom-0 w-full border-t border-gray-300 
                      dark:border-slate-700 bg-background p-4">
        <ChatInput
          conversationId={id}
          onNewMessage={handleNewMessage}
          onUpdateAnswer={handleUpdateAnswer}
        />
      </div>
    </div>
  );
}

/******************************************************
 * ChatInput
 ******************************************************/
type ChatInputProps = {
  conversationId: string;
  onNewMessage: (q: string, fileNames: string[]) => string;
  onUpdateAnswer: (tempId: string, finalAnswer: string) => void;
};

function ChatInput({
  conversationId,
  onNewMessage,
  onUpdateAnswer,
}: ChatInputProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fake progress bar
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message && files.length === 0) return;

    // First, pass all file names so we can show them in the user bubble
    const fileNames = files.map((f) => f.name);
    // 1) Add local "thinking" bubble with attachments
    const tempId = onNewMessage(message, fileNames);

    try {
      setIsLoading(true);

      // 2) If a file is attached, upload
      let uploadId: string | undefined;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append("conversation_id", conversationId);
        formData.append("file", files[0]);

        const res = await fetch("http://127.0.0.1:5000/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("File upload failed");
        const data = await res.json();
        uploadId = data.upload_id;
      }

      // 3) /execute
      const finalAnswer = await callExecute(message, uploadId);

      // 4) patch DB
      await patchConversation(message, finalAnswer);

      // 5) replace "Thinking..." with real answer
      onUpdateAnswer(tempId, finalAnswer);

      // Clear local states
      setMessage("");
      setFiles([]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
      });
      // Show error in local bubble
      onUpdateAnswer(tempId, "Error: " + err.message);
    } finally {
      setIsLoading(false);
      // router.refresh(); // optional
    }
  }

  // No-file scenario => just simulate
  async function callExecute(text: string, uploadId?: string) {
    if (!uploadId) {
      return `Simulated response. You said: ${text}`;
    }
    const execRes = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, upload_id: uploadId }),
    });
    if (!execRes.ok) {
      const errData = await execRes.json().catch(() => ({}));
      throw new Error(errData.error || "Execute command failed");
    }
    const execData = await execRes.json();
    return execData.output || "No answer";
  }

  async function patchConversation(q: string, a: string) {
    const res = await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, answer: a }),
    });
    if (!res.ok) {
      throw new Error("Updating conversation in DB failed");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* Fake progress bar */}
      {isLoading && (
        <div className="bg-gray-300 h-2 w-full rounded">
          <div
            className="bg-sky-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className="flex items-center justify-center 
                     h-12 w-12 text-xl text-sky-500 
                     cursor-pointer"
        >
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

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100
                         dark:bg-gray-800 p-2 rounded-lg"
            >
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
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
