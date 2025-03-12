// // "use server";

// import { getUser } from "@/lib/auth";
// import { generateRandomId } from "@/lib/utils";
// import prisma from "@/prisma/client";
// import { redirect } from "next/navigation";
// import { revalidatePath } from "next/cache";
// // import { JsonMessagesArraySchema } from "@/types"; // if you need schema validation

// // export type NewMessage = {
// //   message: string;
// //   files?: File[];
// // };

// // /**
// //  * Create a new conversation:
// //  * 1) Upload the PDF (if any) to your Flask backend -> get upload_id
// //  * 2) Call /execute with { text, upload_id } -> get answer
// //  * 3) Save to DB & redirect
// //  */
// // export async function newChat(params: NewMessage) {
// //   const session = await getUser();
// //   if (!session?.user) redirect("/login");

// //   let uploadId: string | undefined;

// //   // 1) If user attached a file, upload it to /upload
// //   if (params.files && params.files.length > 0) {
// //     // We'll just take the first file
// //     const file = params.files[0];

// //     // Prepare multipart/form-data
// //     const formData = new FormData();
// //     formData.append("file", file);

// //     const res = await fetch("http://127.0.0.1:5000/upload", {
// //       method: "POST",
// //       body: formData,
// //     });

// //     if (!res.ok) {
// //       throw new Error("File upload failed");
// //     }
// //     const data = await res.json();
// //     uploadId = data.upload_id;
// //   }

// //   // 2) Call /execute with the user's query (text) and upload_id
// //   const executeRes = await fetch("http://127.0.0.1:5000/execute", {
// //     method: "POST",
// //     headers: { "Content-Type": "application/json" },
// //     body: JSON.stringify({
// //       text: params.message,
// //       upload_id: uploadId,
// //     }),
// //   });

// //   if (!executeRes.ok) {
// //     const errData = await executeRes.json().catch(() => ({}));
// //     throw new Error(errData?.error || "Execute command failed");
// //   }

// //   const executeData = await executeRes.json();
// //   const answer = executeData.output || "No answer";

// //   // 3) Store result in DB
// //   const newConversationId = generateRandomId(8);
// //   const newMessageJson = [
// //     {
// //       id: newConversationId,
// //       question: params.message,
// //       answer: answer,
// //     },
// //   ];

// //   const dataRef = await prisma.conversation.create({
// //     data: {
// //       messages: newMessageJson,
// //       name: params.message,
// //       userId: session.user.id,
// //     },
// //   });

// //   // 4) Redirect to new chat
// //   redirect(`/chat/${dataRef.id}`);
// // }

// // /**
// //  * Add a message to an existing conversation:
// //  * - Optionally re-upload a file, or skip if no file
// //  * - /execute again
// //  * - Update conversation in DB
// //  */
// // export async function chat(params: {
// //   conversationId: string;
// //   message: string;
// //   files?: File[];
// // }) {
// //   // If you want the same logic as `newChat`, just do the same steps:
// //   // 1) Upload file -> get upload_id
// //   // 2) /execute { text, upload_id }
// //   // 3) Update DB with new Q/A
// //   // 4) Revalidate

// //   // For brevity, a simplified example:
// //   let uploadId: string | undefined;
// //   if (params.files && params.files.length > 0) {
// //     const file = params.files[0];
// //     const formData = new FormData();
// //     formData.append("file", file);
// //     const res = await fetch("http://127.0.0.1:5000/upload", {
// //       method: "POST",
// //       body: formData,
// //     });
// //     if (!res.ok) throw new Error("File upload failed");
// //     uploadId = (await res.json()).upload_id;
// //   }

//   // /execute
//   const executeRes = await fetch("http://127.0.0.1:5000/execute", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       text: params.message,
//       upload_id: uploadId,
//     }),
//   });

//   if (!executeRes.ok) {
//     const errData = await executeRes.json().catch(() => ({}));
//     throw new Error(errData?.error || "Execute command failed");
//   }

//   const executeData = await executeRes.json();
//   const answer = executeData.output || "No answer";

//   // Update existing conversation
//   const existing = await prisma.conversation.findUnique({
//     where: { id: params.conversationId },
//   });
//   if (!existing) throw new Error("Conversation not found");

//   // Example: parse, push new Q/A, update
//   // If you have a JSON schema, do that here
//   const updatedMessages = [
//     ...(existing.messages as any[]), // or validate
//     {
//       id: generateRandomId(8),
//       question: params.message,
//       answer: answer,
//     },
//   ];

//   await prisma.conversation.update({
//     where: { id: params.conversationId },
//     data: { messages: updatedMessages },
//   });

//   // Revalidate or redirect
//   revalidatePath(`/chat/${params.conversationId}`);
// }
