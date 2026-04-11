import { z } from "zod";

const normalizeText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim();
};

const normalizeUpper = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim().toUpperCase();
};

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export const attemptIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
  attemptId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid attempt id"),
});

export const listAttemptQuerySchema = z.object({
  search: z.preprocess(normalizeText, z.string()).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  resultStatus: z
    .preprocess(normalizeUpper, z.enum(["PENDING_EVALUATION", "READY", "PUBLISHED"]))
    .optional(),
  status: z.preprocess(normalizeUpper, z.enum(["SUBMITTED", "TIMEOUT"])).optional(),
});

export const gradeTextAnswersSchema = z.object({
  items: z
    .array(
      z.object({
        questionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid question id"),
        manualAwardedMarks: z.number().min(0),
      }),
    )
    .min(1),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type AttemptIdParamInput = z.infer<typeof attemptIdParamSchema>;
export type ListAttemptQueryInput = z.infer<typeof listAttemptQuerySchema>;
export type GradeTextAnswersInput = z.infer<typeof gradeTextAnswersSchema>;

