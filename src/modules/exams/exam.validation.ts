import { z } from "zod";

export const createExamBasicInfoSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    totalCandidates: z.number().int().min(0),
    totalSlots: z.number().int().min(1),
    totalQuestionSet: z.number().int().min(1),
    questionType: z.enum(["MCQ", "RADIO", "CHECKBOX", "TEXT", "MIXED"]),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    durationMinutes: z.number().int().min(1),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startTime).getTime();
    const end = new Date(value.endTime).getTime();

    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  });

export type CreateExamBasicInfoInput = z.infer<typeof createExamBasicInfoSchema>;
