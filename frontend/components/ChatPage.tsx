// components/ChatPage.tsx
"use client";
import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { IoMdAttach } from "react-icons/io";
import { BsWebcam } from "react-icons/bs";
import { MdKeyboardVoice } from "react-icons/md";
import { Input } from "./ui/input";
import Submit from "./submit";
import { useToast } from "./ui/use-toast";
import { generateRandomId } from "@/lib/utils";
import Image from "next/image";

type Message = {
  id: string;
  question: string;
  answer?: string;
  attachments?: string[];
};

export default function ChatPage({ projectId, chatId, initialMessages }: { projectId: string; chatId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [showModal, setShowModal] = useState(false);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  function handleNewMessage(question: string, attachments: string[]): string {
    const tempId = generateRandomId(8);
    setMessages((prev) => [...prev, { id: tempId, question, answer: "Thinking...", attachments }]);
    return tempId;
  }

  function handleUpdateAnswer(tempId: string, finalAnswer: string) {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, answer: finalAnswer } : m)));
  }

  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);
    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    return data.upload_id;
  }

  async function callExecute(text: string, uploadId?: string) {
    const body = { text, project_id: projectId, upload_id: uploadId };
    const execRes = await fetch("http://127.0.0.1:5000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!execRes.ok) {
      const errData = await execRes.json().catch(() => ({}));
      throw new Error(errData.error || "Execute command failed");
    }
    const execData = await execRes.json();
    return execData.output || "No answer";
  }

  async function patchConversation(question: string, answer: string, attachments: string[]) {
    const res = await fetch(`/api/conversation/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, attachments }),
    });
    if (!res.ok) throw new Error("Updating conversation in DB failed");
  }

  async function captureDocumentPhoto(clean = "") {
    const outputFilename = `captured_document_${captureIndex}.jpg`;
    const res = await fetch("http://127.0.0.1:5000/capture-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camera_index: 0,
        output_filename: outputFilename,
        project_id: projectId,
        should_clean: clean,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Capture document photo failed");
    setCapturedImages((prev) => [...prev, data.filename]);
    setCaptureIndex((prev) => prev + 1);
    return data.upload_id;
  }

  async function createPdf() {
    try {
      await fetch("http://127.0.0.1:5000/capture-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          images: capturedImages,
          pdf_filename: `scanned_pdf_${Date.now()}.pdf`,
        }),
      });
    } catch (error) {
      console.error("Error creating PDF:", error);
    }
  }

  async function startVoiceRecording() {
    const res = await fetch("http://127.0.0.1:5000/start-recording", { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to start recording");
    }
    setIsRecording(true);
  }

  async function stopVoiceRecording() {
    const res = await fetch("http://127.0.0.1:5000/stop-recording", { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to stop recording");
    }
    const data = await res.json();
    setIsRecording(false);
    setVoiceTranscript(data.transcript);
  }

  function ChatInput() {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!message && files.length === 0 && !voiceTranscript) return;
      const attachments: string[] = files.map((f) => f.name);
      const tempId = handleNewMessage(message || voiceTranscript, attachments);
      try {
        setIsLoading(true);
        let uploadId: string | undefined;
        if (files.length > 0) {
          uploadId = await uploadFile(files[0]);
        }
        const finalText = message || voiceTranscript;
        const finalAnswer = await callExecute(finalText, uploadId);
        await patchConversation(finalText, finalAnswer, attachments);
        handleUpdateAnswer(tempId, finalAnswer);
        setMessage("");
        setFiles([]);
        setVoiceTranscript("");
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Something went wrong",
        });
        handleUpdateAnswer(tempId, "Error: " + err.message);
      } finally {
        setIsLoading(false);
        router.refresh();
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
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {isLoading && (
          <div className="bg-gray-300 h-2 w-full rounded">
            <div className="bg-sky-500 h-2 rounded" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="flex items-center justify-center text-xl text-sky-500 cursor-pointer">
            <IoMdAttach className="w-10 h-10 p-2" />
            <input type="file" multiple onChange={handleFileChange} className="hidden" />
          </label>
          <button
            type="button"
            onClick={async () => {
              try {
                setCapturedImages([]);
                setCaptureIndex(0);
                await captureDocumentPhoto("clean");
                setShowModal(true);
              } catch (error) {
                console.error(error);
              }
            }}
            className="flex items-center justify-center text-xl text-sky-500 cursor-pointer"
          >
            <BsWebcam className="w-10 h-10 p-2" />
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                if (!isRecording) {
                  await startVoiceRecording();
                } else {
                  await stopVoiceRecording();
                }
              } catch (error) {
                console.error(error);
              }
            }}
            className="flex items-center justify-center text-xl text-sky-500 cursor-pointer"
          >
            <MdKeyboardVoice className="w-10 h-10 p-2" />
          </button>
          <Input
            multiline
            autoComplete="off"
            placeholder="Ask me something..."
            className="flex-grow"
            value={message || voiceTranscript}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <Submit disabled={isLoading} />
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                <button type="button" onClick={() => removeFile(index)} className="text-red-500 text-xl">
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-1 justify-end">
                {msg.attachments.map((filename, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-600 text-sm text-black dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-slate-500 max-w-[200px] truncate" title={filename}>
                    📎 {filename}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <div className="bg-sky-500 text-white px-4 py-2 max-w-[70%] rounded-xl rounded-br-none whitespace-pre-wrap">
                {msg.question}
              </div>
            </div>
            {msg.answer && (
              <div className="flex justify-start mt-2">
                <div className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-4 py-2 max-w-[70%] rounded-xl rounded-bl-none whitespace-pre-wrap">
                  {msg.answer}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 w-full border-t border-gray-300 dark:border-slate-700 bg-background p-4">
        <ChatInput />
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">New Scan</h2>
              <button onClick={() => setShowModal(false)} className="text-red-500 text-xl">
                &times;
              </button>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-2">
                {capturedImages.map((filename, idx) => (
                  <Image key={idx} src={`/projects/${projectId}/${filename}`} alt={`Captured ${filename}`} className="w-full h-auto border rounded mb-2" width={100} height={100} />
                ))}
              </div>
              <button type="button" onClick={async () => { try { await captureDocumentPhoto(); } catch (error) { console.error(error); } }} className="mb-0 mr-2 px-4 py-2 bg-blue-500 text-white rounded">
                Scan another image
              </button>
              <button type="button" onClick={async () => { try { await createPdf(); setShowModal(false); } catch (error) { console.error(error); } }} className="mb-0 px-4 py-2 bg-blue-500 text-white rounded">
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
