// import { z } from "zod";

// export const JsonMessageSchema = z.object({
//   id: z.string(),
//   answer: z.string().optional(),
//   question: z.string(),
// });

// export const JsonMessagesArraySchema = z.array(JsonMessageSchema);

// export type JSONMessage = z.infer<typeof JsonMessageSchema>;
// /types.ts
import { z } from "zod";

// Each message can have optional attachments
export const SingleMessageSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export const JsonMessagesArraySchema = z.array(SingleMessageSchema);

export type Message = z.infer<typeof SingleMessageSchema>;
