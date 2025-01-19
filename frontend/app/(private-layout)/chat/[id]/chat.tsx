"use client";

import { chat } from "@/actions/chat"; 
import Submit from "@/components/submit";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ElementRef, useRef, useState } from "react";
import { IoMdAttach } from "react-icons/io";

type ConversationComponent = {
  id: string;
  addMessage: (msg: string) => void;
};

export function ChatInput({ addMessage, id }: ConversationComponent) {
  const inputRef = useRef<ElementRef<"input">>(null);
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit(formData: FormData) {
    const message = formData.get("message") as string;
    if (!message && files.length === 0) return;

    // For real usage, consider separate logic if you want to do single file or multiple
    addMessage(message);

    try {
      await chat({
        conversationId: id,
        message,
        files,
      });
      setFiles([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
      });
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 sm:pr-5">
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
          ref={inputRef}
          autoComplete="off"
          name="message"
          placeholder="Ask me something..."
          className="h-12 flex-grow"
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
                onClick={() => handleRemoveFile(i)}
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
