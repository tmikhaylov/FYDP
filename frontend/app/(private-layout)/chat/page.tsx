"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInputNew from "./input";
import { generateRandomId } from "@/lib/utils";
import Footer from "@/components/footer";

export default function NewChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<
    {
      id: string;
      question: string;
      answer?: string;
      attachments?: string[];
    }[]
  >([]);

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

  function handleUpdateAnswer(
    tempId: string,
    finalAnswer: string,
    conversationId: string | null
  ) {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, answer: finalAnswer } : m))
    );
    // Once we get a final answer, navigate to the new conversation
    if (conversationId) {
      router.push(`/chat/${conversationId}`);
    }
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Scrollable area for messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto custom-scrollbar">
        {/* Show welcome header ONLY if there are no messages yet */}
        {messages.length === 0 && (
          <div className="mb-6">
            <div className="text-xl font-medium dark:text-sky-200 text-sky-700">
              How can I help you today?
            </div>
            <div className="dark:text-slate-300 text-slate-900">
              ScanKit can make mistakes. Consider checking important information.
            </div>
          </div>
        )}

        {/* Render each message */}
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            {/* Attachments above the user bubble, right-aligned */}
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
            {/* User bubble (right) */}
            <div className="flex justify-end">
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
            {/* AI bubble (left) */}
            {msg.answer && (
              <div className="flex justify-start mt-2">
                <div
                  className="
                    bg-gray-200 dark:bg-gray-700
                    text-black dark:text-white
                    px-4 py-2 max-w-[70%]
                    rounded-xl rounded-bl-none
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

      {/* Sticky input + Footer at bottom */}
      <div className="sticky bottom-0 w-full border-t border-gray-300 dark:border-slate-700 bg-background p-4 flex flex-col">
        <ChatInputNew
          onNewMessage={handleNewMessage}
          onUpdateAnswer={handleUpdateAnswer}
        />
        <Footer />
      </div>
    </div>
  );
}
