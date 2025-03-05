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
  scanned?: boolean; // marks if the attachment is from a scan
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
  // Existing messages
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Loading spinner & progress
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  // For the progress bar
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

  // Add a new "thinking..." message
  function handleNewMessage(question: string, attachments: string[]): string {
    const tempId = generateRandomId(8);
    setMessages((prev) => [
      ...prev,
      { id: tempId, question, answer: "Thinking...", attachments },
    ]);
    return tempId;
  }

  // Replace "thinking..." with final answer
  function handleUpdateAnswer(tempId: string, finalAnswer: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, answer: finalAnswer } : m))
    );
  }

  // Upload a file to /upload => returns { upload_id, filename }
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

    // Get the original filename from get_filename
    const getRes = await fetch(`http://127.0.0.1:5000/get_filename/${data.upload_id}`);
    const getData = await getRes.json();
    const upload_id = data.upload_id;
    const filename = getData.filename;

    // If it's a scanned PDF (legacy naming), remove the original once re-uploaded
    if (file.name.startsWith("scanned_pdf_")) {
      await fetch("http://127.0.0.1:5000/delete-file-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, filename: file.name }),
      });
    }

    return { upload_id, filename };
  }

  // Calls /execute with optional upload_id
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

  // Patch conversation in Next.js DB
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

  // Stop voice recording => get transcript
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

  // ----------------------------------
  // Inner ChatInput component
  // ----------------------------------
  function ChatInput() {
    const [message, setMessage] = useState("");
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [captureIndex, setCaptureIndex] = useState(0);

    // States for live video capture preview
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const formRef = useRef<HTMLFormElement>(null);

    // Start video stream when modal is open and capturing is enabled
    useEffect(() => {
      let stream: MediaStream;
      if (showModal && isCapturing) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((s) => {
            stream = s;
            setMediaStream(s);
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            console.error("Error accessing camera:", err);
          });
      }
      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [showModal, isCapturing]);

    // Function to call /capture-document API to capture a document photo
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

    // Handler for the Capture Image button – calls the /capture-document API
    async function handleCapture() {
      try {
        const shouldClean = captureIndex === 0 ? "clean" : "";
        await captureDocumentPhoto(shouldClean);
        // Stop the video stream after capture
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          setMediaStream(null);
        }
        setIsCapturing(false);
      } catch (error) {
        console.error("Error capturing document:", error);
      }
    }

    // Create PDF from captured images => attach as a File.
    // Now, before creating the PDF, we prompt the user for a custom file name.
    async function createPdf() {
      try {
        const customName = window.prompt("Give a name to this file scan", `scan_${Date.now()}`);
        if (!customName) {
          toast({ title: "Cancelled", description: "Scan cancelled: no name provided" });
          return;
        }
        const pdfFilename = `${customName}.pdf`;
        const res = await fetch("http://127.0.0.1:5000/capture-to-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            images: capturedImages,
            pdf_filename: pdfFilename,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create PDF");
        }
        const data = await res.json();
        const finalPdfFilename = data.pdf_filename;

        // Retrieve PDF from server
        const pdfUrl = `/projects/${projectId}/${finalPdfFilename}`;
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error("Failed to retrieve the PDF from the server");
        }
        const pdfBlob = await pdfResponse.blob();

        // Wrap in a File object and mark it as scanned
        const pdfFile = new File([pdfBlob], finalPdfFilename, { type: "application/pdf" });
        setAttachments((prev) => [...prev, { file: pdfFile, scanned: true }]);
      } catch (error) {
        console.error("Error creating PDF:", error);
        toast({
          title: "Error",
          description: (error as Error).message || "Something went wrong",
        });
      }
    }

    // Submit the chat input
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!message && attachments.length === 0 && !voiceTranscript) return;

      const attachmentNames = attachments.map((att) => att.file.name);
      const tempId = handleNewMessage(message || voiceTranscript, attachmentNames);

      try {
        setIsLoading(true);

        let uploadId: string | undefined;
        if (attachments.length > 0) {
          // Process only the first attachment for execution
          let att = attachments[0];
          if (!att.upload_id) {
            const uploadResult = await uploadFile(att.file);
            uploadId = uploadResult.upload_id;

            // Update local attachments
            att = { ...att, upload_id: uploadResult.upload_id, filename: uploadResult.filename };
            setAttachments((prev) => {
              const newArr = [...prev];
              newArr[0] = att;
              return newArr;
            });

            // Insert into DB
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

        const finalText = message || voiceTranscript;
        const finalAnswer = await callExecute(finalText, uploadId);
        await patchConversation(finalText, finalAnswer, attachmentNames);
        handleUpdateAnswer(tempId, finalAnswer);

        // Delete all scanned PDF attachments from storage (if any)
        const scannedPdfAttachments = attachments.filter((att) => att.scanned);
        if (scannedPdfAttachments.length > 0) {
          await Promise.all(
            scannedPdfAttachments.map((att) =>
              fetch("http://127.0.0.1:5000/delete-file-manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: projectId, filename: att.file.name }),
              })
            )
          );
        }

        // Reset input fields and attachments
        setMessage("");
        setAttachments([]);
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

    // User attaches local files
    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
      if (!e.target.files) return;
      const newFiles = Array.from(e.target.files).map((file) => ({ file }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }

    // User removes an attachment
    async function removeAttachment(index: number) {
      const attachment = attachments[index];
      setAttachments((prev) => prev.filter((_, i) => i !== index));

      // For scanned PDFs, call delete-file-manual to remove from storage
      if (attachment.scanned) {
        await fetch("http://127.0.0.1:5000/delete-file-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, filename: attachment.file.name }),
        });
      } else if (attachment.upload_id) {
        // If it was uploaded (non-scanned attachment), delete from server + DB
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
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
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
              onClick={() => {
                setCapturedImages([]);
                setCaptureIndex(0);
                setShowModal(true);
                setIsCapturing(true);
              }}
              className="flex items-center justify-center text-xl text-sky-500 cursor-pointer"
            >
              <BsWebcam className="w-10 h-10 p-2" />
            </button>

            {/* Voice record */}
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
              className={`flex items-center justify-center text-xl ${
                isRecording ? "text-red-500 animate-pulse" : "text-sky-500"
              } cursor-pointer relative`}
            >
              <MdKeyboardVoice className="w-10 h-10 p-2" />
              {isRecording && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              )}
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

            {/* Submit */}
            <Submit disabled={isLoading} />
          </div>

          {/* Show attachments */}
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
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => {
                if (mediaStream) {
                  mediaStream.getTracks().forEach((track) => track.stop());
                }
                setShowModal(false);
                setIsCapturing(false);
              }}
            />
            <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">New Scan</h2>
                <button
                  onClick={() => {
                    if (mediaStream) {
                      mediaStream.getTracks().forEach((track) => track.stop());
                    }
                    setShowModal(false);
                    setIsCapturing(false);
                  }}
                  className="text-red-500 text-xl"
                >
                  &times;
                </button>
              </div>
              {isCapturing ? (
                <div>
                  <video ref={videoRef} className="w-full" autoPlay playsInline></video>
                  <button
                    onClick={handleCapture}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Capture Image
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {capturedImages.map((filename, idx) => (
                      <Image
                        key={idx}
                        src={`/projects/${projectId}/${filename}?ts=${Date.now()}`}
                        alt={`Captured ${filename}`}
                        className="w-full h-auto border rounded mb-2"
                        width={100}
                        height={100}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCapturing(true);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      Scan another page
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await createPdf();
                        setShowModal(false);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      Save as PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ----------------------------------
  // Return the full layout
  // ----------------------------------
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 sm:w-[95%] mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-6">
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
    </div>
  );
}
