"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import Submit from "@/components/submit";
import { useToast } from "@/components/ui/use-toast";
import { IoMdAttach, IoMdArrowUp } from "react-icons/io";
import { useRouter } from "next/navigation";

export default function ChatInputNew({
  onNewMessage,
  onUpdateAnswer,
}: {
  onNewMessage: (q: string, fileNames: string[]) => string;
  onUpdateAnswer: (tempId: string, finalAnswer: string, conversationId: string | null) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // For capturing documents
  const [showModal, setShowModal] = useState(false);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("project_1");
  const [scannedPdfId, setScannedPdfId] = useState(0);

  // Fake progress bar effect
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

  // 1) Create new conversation in DB
  async function createConversationInDB() {
    const storeRes = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: null,
        answer: null,
      }),
    });
    if (!storeRes.ok) throw new Error("Storing conversation in DB failed");
    const storeData = await storeRes.json();
    setProjectId(storeData.project_id);
    return storeData.id; // conversation ID
  }

  // 2) Upload file if present
  async function uploadFile(conversationId: string, file: File) {
    const formData = new FormData();
    formData.append("conversation_id", conversationId);
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    return data.upload_id;
  }

  // 3) Call /execute
  async function callExecute(text: string, uploadId: string | undefined) {
    if (!uploadId) {
      return `Simulated no-file answer: You said: ${text}`;
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

  // 4) Patch conversation with final Q/A
  async function patchConversation(
    conversationId: string,
    question: string,
    answer: string
  ) {
    const patchRes = await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer }),
    });
    if (!patchRes.ok)
      throw new Error("Failed to update conversation with final answer");
  }

  // 5) Handle "Capture Document" (IoMdArrowUp)
  async function captureDocumentPhoto(clean = "") {
    const outputFilename = `captured_document_${captureIndex}.jpg`;
    const res = await fetch("http://127.0.0.1:5000/capture-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camera_index: 1,
        output_filename: outputFilename,
        project_id: projectId,
        should_clean: clean,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Capture document photo failed");
    }
    setCapturedImages((prev) => [...prev, data.path]);
    setCaptureIndex((prev) => prev + 1);
  }

  async function createPdf() {
    try {
      const res = await fetch("http://127.0.0.1:5000/capture-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          images: capturedImages,
          pdf_filename: `scanned_pdf${scannedPdfId}.pdf`,
        }),
      });
    } catch (error) {
      console.error("Error creating PDF:", error);
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

  // Main form submission
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message && files.length === 0) return;

    // Immediately create an optimistic bubble
    const fileNames = files.map((f) => f.name);
    const tempId = onNewMessage(message, fileNames);

    try {
      setIsLoading(true);

      // Create conversation in DB
      const conversationId = await createConversationInDB();

      // Upload file if any
      let uploadId: string | undefined;
      if (files.length > 0) {
        uploadId = await uploadFile(conversationId, files[0]);
      }

      // Execute
      const finalAnswer = await callExecute(message, uploadId);

      // Update DB with final Q/A
      await patchConversation(conversationId, message, finalAnswer);

      // Update the bubble + navigate
      onUpdateAnswer(tempId, finalAnswer, conversationId);

      // Clear local form states
      setMessage("");
      setFiles([]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
      });
      // Show error in the bubble
      onUpdateAnswer(tempId, "Error: " + err.message, null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Progress bar */}
        {isLoading && (
          <div className="bg-gray-300 h-2 w-full rounded">
            <div
              className="bg-sky-500 h-2 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Attach button */}
          <label className="flex items-center justify-center h-12 w-12 text-xl text-sky-500 cursor-pointer">
            <IoMdAttach />
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Capture document (IoMdArrowUp) */}
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
            className="flex items-center justify-center h-12 w-12 text-xl text-sky-500 cursor-pointer"
          >
            <IoMdArrowUp />
          </button>

          {/* Text input */}
          <Input
            autoComplete="off"
            placeholder="Ask me something..."
            className="h-12 flex-grow"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* Submit button */}
          <Submit disabled={isLoading} />
        </div>

        {/* Display any attached files */}
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

      {/* Modal for scanned images / saving PDF */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowModal(false)}
          ></div>

          {/* Modal window */}
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Scan</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-red-500 text-xl"
              >
                &times;
              </button>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-2">
                {capturedImages.map((filename, idx) => (
                  <img
                    key={idx}
                    src={`/projects/${projectId}/new_pdf/${filename}`}
                    alt={`Captured ${filename}`}
                    className="w-full h-auto border rounded"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await captureDocumentPhoto();
                  } catch (error) {
                    console.error(error);
                  }
                }}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Scan another image
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await createPdf();
                    setScannedPdfId((prev) => prev + 1);
                    setShowModal(false);
                  } catch (error) {
                    console.error(error);
                  }
                }}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
