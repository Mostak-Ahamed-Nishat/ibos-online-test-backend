import { z } from "zod";

const normalizeText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim();
};

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export const analyticsListQuerySchema = z.object({
  search: z.preprocess(normalizeText, z.string()).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type AnalyticsListQueryInput = z.infer<typeof analyticsListQuerySchema>;

