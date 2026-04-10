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

export const listExamQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(8),
});

export type ListExamQueryInput = z.infer<typeof listExamQuerySchema>;

export const examIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
});

const questionOptionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});

export const addExamQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1),
    type: z.enum(["RADIO", "CHECKBOX", "TEXT"]),
    marks: z.number().min(0),
    negativeMarks: z.number().min(0).optional().default(0),
    options: z.array(questionOptionSchema).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "TEXT") {
      if (value.options.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "TEXT question cannot have options",
        });
      }
      return;
    }

    if (value.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "At least 2 options are required",
      });
    }

    const correctCount = value.options.filter((option) => option.isCorrect).length;
    if (value.type === "RADIO" && correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "RADIO question must have exactly one correct option",
      });
    }

    if (value.type === "CHECKBOX" && correctCount < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "CHECKBOX question must have at least one correct option",
      });
    }
  });

export type ExamIdParamInput = z.infer<typeof examIdParamSchema>;
export type AddExamQuestionInput = z.infer<typeof addExamQuestionSchema>;
