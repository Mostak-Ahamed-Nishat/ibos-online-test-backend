import { z } from "zod";

const normalizeAction = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim().toUpperCase();
};

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export const updateCurrentQuestionSchema = z.object({
  action: z.preprocess(normalizeAction, z.enum(["SAVE", "SKIP"])),
  selectedOptionIndexes: z.array(z.number().int().min(0)).optional().default([]),
  answerText: z.string().trim().optional().default(""),
  jumpToOrder: z.number().int().min(1).optional(),
});

const offlineAnswerItemSchema = z.object({
  questionOrder: z.number().int().min(1),
  action: z.preprocess(normalizeAction, z.enum(["SAVE", "SKIP"])),
  selectedOptionIndexes: z.array(z.number().int().min(0)).optional().default([]),
  answerText: z.string().trim().optional().default(""),
});

export const offlineSyncSchema = z.object({
  currentQuestionOrder: z.number().int().min(1).optional(),
  items: z.array(offlineAnswerItemSchema).min(1),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type UpdateCurrentQuestionInput = z.infer<typeof updateCurrentQuestionSchema>;
export type OfflineSyncInput = z.infer<typeof offlineSyncSchema>;
