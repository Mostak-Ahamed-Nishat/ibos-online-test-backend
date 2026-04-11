import { z } from "zod";

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export const candidateResultListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type CandidateResultListQueryInput = z.infer<typeof candidateResultListQuerySchema>;

