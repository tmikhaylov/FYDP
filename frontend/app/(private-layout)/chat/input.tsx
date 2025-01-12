"use client";

import Submit from "@/components/submit";
import { Input } from "@/components/ui/input";
import { newChat } from "@/actions/chat";
import { useToast } from "@/components/ui/use-toast";
import { IoMdAttach } from "react-icons/io";
import { useState } from "react";

export default function ChatInput() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit(formData: FormData) {
    const message = formData.get("message") as string;
    if (!message && files.length === 0) return;

    const apiKey = localStorage.getItem("apiKey");
    if (!apiKey) {
      toast({
        title: "No API key found!",
        description: 'Please add API key from "My account" section',
      });
      return;
    }

    const chatData: any = { apiKey, message };
    if (files.length > 0) {
      chatData.files = files; // Include files in the request payload
    }

    const { message: err } = await newChat(chatData);
    if (err) {
      toast({
        title: err,
      });
    } else {
      setFiles([]); // Clear the file list after successful submission
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(selectedFiles)]);
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-col gap-2 sm:pr-5"
    >
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
                onClick={() => handleRemoveFile(index)}
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
