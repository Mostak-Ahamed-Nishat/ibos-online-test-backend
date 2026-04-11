import { z } from "zod";

const normalizeUpper = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim().toUpperCase();
};

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

export const reportIntegrityEventSchema = z.object({
  eventType: z.preprocess(
    normalizeUpper,
    z.enum(["TAB_SWITCH", "FULLSCREEN_EXIT", "COPY_PASTE", "RIGHT_CLICK"]),
  ),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type ReportIntegrityEventInput = z.infer<typeof reportIntegrityEventSchema>;

