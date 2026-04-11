import { z } from "zod";

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;

