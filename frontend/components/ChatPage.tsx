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

type AttachmentItem = {
  file: File;
  upload_id?: string;
  filename?: string;
};

export default function ChatPage({
  projectId,
  chatId,
  initialMessages,
}: {
  projectId: string;
  chatId: string;
  initialMessages: Message[];
}) {
  // Holds the list of existing messages for this chat
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Track loading and progress for the chat
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Track voice recording state
  const [isRecording, setIsRecording] = useState(false);

  // Holds any recognized speech from the microphone
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  // When loading is set to true, increment progress in a small loop
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

  // Helper to add a new "thinking..." message to the UI
  function handleNewMessage(question: string, attachments: string[]): string {
    const tempId = generateRandomId(8);
    setMessages((prev) => [
      ...prev,
      { id: tempId, question, answer: "Thinking...", attachments },
    ]);
    return tempId;
  }

  // Helper to replace the "thinking..." with the final answer
  function handleUpdateAnswer(tempId: string, finalAnswer: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, answer: finalAnswer } : m))
    );
  }

  // Upload a single File to your Python backend => returns { upload_id, filename }
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
    // Now fetch the "original filename" from get_filename
    const getRes = await fetch(`http://127.0.0.1:5000/get_filename/${data.upload_id}`);
    const getData = await getRes.json();
    return { upload_id: data.upload_id, filename: getData.filename };
  }

  // Sends the text + optional file to the Python backend for "execute" logic
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

  // Patches the conversation in your Next.js DB with the question/answer
  async function patchConversation(question: string, answer: string, attachments: string[]) {
    const res = await fetch(`/api/conversation/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, attachments }),
    });
    if (!res.ok) throw new Error("Updating conversation in DB failed");
  }

  // Start voice recording
  async function startVoiceRecording() {
    const res = await fetch("http://127.0.0.1:5000/start-recording", { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to start recording");
    }
    setIsRecording(true);
  }

  // Stop voice recording and fetch the transcript
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

  // -------------------------
  // Inner ChatInput Component
  // -------------------------
  function ChatInput() {
    // For typed text input
    const [message, setMessage] = useState("");

    // For file attachments
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

    // For webcam scanning
    const [showModal, setShowModal] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [captureIndex, setCaptureIndex] = useState(0);

    const formRef = useRef<HTMLFormElement>(null);

    // Use the same captureDocumentPhoto logic inside ChatInput so we can handle images
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

    // Creates a PDF from all captured images => returns that PDF filename
    // Then we treat that PDF as a newly attached file
    async function createPdf() {
      try {
        const res = await fetch("http://127.0.0.1:5000/capture-to-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            images: capturedImages,
            pdf_filename: `scanned_pdf_${Date.now()}.pdf`,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create PDF");
        }
        const data = await res.json();
        const pdfFilename = data.pdf_filename; // e.g. "scanned_pdf_12345.pdf"

        // Now fetch that PDF from the server
        const pdfUrl = `/projects/${projectId}/${pdfFilename}`;
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error("Failed to retrieve the PDF from the server");
        }
        const pdfBlob = await pdfResponse.blob();

        // Wrap it in a File object
        const pdfFile = new File([pdfBlob], pdfFilename, { type: "application/pdf" });

        // Add to attachments so it appears under the chat input
        setAttachments((prev) => [...prev, { file: pdfFile }]);
      } catch (error) {
        console.error("Error creating PDF:", error);
        toast({
          title: "Error",
          description: (error as Error).message || "Something went wrong",
        });
      }
    }

    // Submits the chat input (text + optional attachment)
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      // If user typed nothing and attached nothing, do nothing
      if (!message && attachments.length === 0 && !voiceTranscript) return;

      // For the conversation record, gather attachment filenames
      const attachmentNames = attachments.map((att) => att.file.name);

      // Add a placeholder message
      const tempId = handleNewMessage(message || voiceTranscript, attachmentNames);

      try {
        setIsLoading(true);

        // If there's at least one attachment, handle the first for "execute"
        let uploadId: string | undefined;
        if (attachments.length > 0) {
          let att = attachments[0];
          // If not uploaded yet, do so
          if (!att.upload_id) {
            const uploadResult = await uploadFile(att.file);
            uploadId = uploadResult.upload_id;

            // Update local state with upload details
            att = { ...att, upload_id: uploadResult.upload_id, filename: uploadResult.filename };
            setAttachments((prev) => {
              const newArr = [...prev];
              newArr[0] = att;
              return newArr;
            });

            // Insert into your DB
            const dbRes = await fetch(`/api/project/${projectId}/db-files`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                upload_id: uploadResult.upload_id,
                filename: uploadResult.filename,
              }),
            });
            if (!dbRes.ok) {
              throw new Error("Failed to update database with file info");
            }
          } else {
            uploadId = att.upload_id;
          }
        }

        // Call the Python /execute with text + optional file
        const finalText = message || voiceTranscript;
        const finalAnswer = await callExecute(finalText, uploadId);

        // Patch conversation in Next.js DB
        await patchConversation(finalText, finalAnswer, attachmentNames);

        // Update the "thinking..." message with final answer
        handleUpdateAnswer(tempId, finalAnswer);

        // Reset the input
        setMessage("");
        setVoiceTranscript("");
        setAttachments([]);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Something went wrong",
        });
        handleUpdateAnswer(tempId, "Error: " + err.message);
      } finally {
        setIsLoading(false);
        // Refresh the page so we see updated conversation
        router.refresh();
      }
    }

    // Called when user selects local files from the IoMdAttach icon
    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
      if (!e.target.files) return;
      const newFiles = Array.from(e.target.files).map((file) => ({ file }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }

    // Called when user removes an attachment
    async function removeAttachment(index: number) {
      const attachment = attachments[index];
      setAttachments((prev) => prev.filter((_, i) => i !== index));

      // If the file was already uploaded, we must delete from disk + DB
      if (attachment.upload_id) {
        await fetch("http://127.0.0.1:5000/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upload_id: attachment.upload_id,
            project_id: projectId,
          }),
        });
        await fetch(`/api/project/${projectId}/db-files?fileId=${attachment.upload_id}`, {
          method: "DELETE",
        });
      }
    }

    return (
      <>
        {/* The chat input form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* Loading progress bar */}
          {isLoading && (
            <div className="bg-gray-300 h-2 w-full rounded">
              <div className="bg-sky-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attach local files */}
            <label className="flex items-center justify-center text-xl text-sky-500 cursor-pointer">
              <IoMdAttach className="w-10 h-10 p-2" />
              <input type="file" multiple onChange={handleFileChange} className="hidden" />
            </label>

            {/* Webcam capture */}
            <button
              type="button"
              onClick={async () => {
                try {
                  setCapturedImages([]);
                  setCaptureIndex(0);
                  // "clean" old images that start with "captured_document_"
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

            {/* Voice record button */}
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

            {/* Text input */}
            <Input
              multiline
              autoComplete="off"
              placeholder="Ask me something..."
              className="flex-grow"
              value={message || voiceTranscript}
              onChange={(e) => {
                setMessage(e.target.value);
                setVoiceTranscript("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />

            {/* Submit button */}
            <Submit disabled={isLoading} />
          </div>

          {/* Display attachments under the input */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((att, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg"
                >
                  <span className="text-sm truncate max-w-[200px]">{att.file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 text-xl"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Webcam scanning modal */}
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
                {/* Show captured images so far */}
                <div className="grid grid-cols-3 gap-2">
                  {capturedImages.map((filename, idx) => (
                    <Image
                      key={idx}
                      src={`/projects/${projectId}/${filename}`}
                      alt={`Captured ${filename}`}
                      className="w-full h-auto border rounded mb-2"
                      width={100}
                      height={100}
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
                  className="mb-0 mr-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Scan another image
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    // Convert all captured images to a PDF
                    // Then attach the resulting PDF to the chat
                    await createPdf();
                    setShowModal(false);
                  }}
                  className="mb-0 px-4 py-2 bg-blue-500 text-white rounded"
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

  // -------------------------
  // Return the full layout
  // -------------------------
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
            {/* Show attachments if any */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-1 justify-end">
                {msg.attachments.map((filename, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-600 text-sm text-black dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-slate-500 max-w-[200px] truncate"
                    title={filename}
                  >
                    📎 {filename}
                  </div>
                ))}
              </div>
            )}
            {/* The user's question */}
            <div className="flex justify-end">
              <div className="bg-sky-500 text-white px-4 py-2 max-w-[70%] rounded-xl rounded-br-none whitespace-pre-wrap">
                {msg.question}
              </div>
            </div>
            {/* The AI's answer */}
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

      {/* The chat input at bottom */}
      <div className="sticky bottom-0 w-full border-t border-gray-300 dark:border-slate-700 bg-background p-4">
        <ChatInput />
      </div>
    </div>
  );
}
