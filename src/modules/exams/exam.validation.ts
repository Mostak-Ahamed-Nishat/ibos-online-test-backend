import { z } from "zod";

const normalizeEnumInput = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim().toUpperCase();
};

export const createExamBasicInfoSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    totalCandidates: z.number().int().min(0),
    totalSlots: z.number().int().min(1),
    totalQuestionSet: z.number().int().min(1),
    questionType: z.preprocess(
      normalizeEnumInput,
      z.enum(["MCQ", "RADIO", "CHECKBOX", "TEXT", "MIXED"]),
    ),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    durationMinutes: z.number().int().min(1),
    attemptLimit: z.number().int().min(1).optional().default(1),
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

export const examQuestionIdParamSchema = z.object({
  examId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exam id"),
  questionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid question id"),
});

export const addQuestionFromBankSchema = z.object({
  bankQuestionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid bank question id"),
});

const questionOptionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});

export const addExamQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1),
    type: z.preprocess(normalizeEnumInput, z.enum(["RADIO", "CHECKBOX", "TEXT"])),
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

export const updateExamBasicInfoSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    totalCandidates: z.number().int().min(0).optional(),
    totalSlots: z.number().int().min(1).optional(),
    totalQuestionSet: z.number().int().min(1).optional(),
    questionType: z
      .preprocess(normalizeEnumInput, z.enum(["MCQ", "RADIO", "CHECKBOX", "TEXT", "MIXED"]))
      .optional(),
    startTime: z.iso.datetime().optional(),
    endTime: z.iso.datetime().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    attemptLimit: z.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.title === undefined &&
      value.totalCandidates === undefined &&
      value.totalSlots === undefined &&
      value.totalQuestionSet === undefined &&
      value.questionType === undefined &&
      value.startTime === undefined &&
      value.endTime === undefined &&
      value.durationMinutes === undefined &&
      value.attemptLimit === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one field is required for update",
      });
      return;
    }

    if (value.startTime && value.endTime) {
      const start = new Date(value.startTime).getTime();
      const end = new Date(value.endTime).getTime();

      if (end <= start) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "End time must be after start time",
        });
      }
    }
  });

export const updateExamStatusSchema = z.object({
  status: z.preprocess(normalizeEnumInput, z.enum(["DRAFT", "PUBLISHED", "EXPIRED"])),
});

export const updateExamQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).optional(),
    type: z.preprocess(normalizeEnumInput, z.enum(["RADIO", "CHECKBOX", "TEXT"])).optional(),
    marks: z.number().min(0).optional(),
    negativeMarks: z.number().min(0).optional(),
    options: z.array(questionOptionSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.prompt === undefined &&
      value.type === undefined &&
      value.marks === undefined &&
      value.negativeMarks === undefined &&
      value.options === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one field is required for update",
      });
      return;
    }

    const resolvedType = value.type;
    const resolvedOptions = value.options;

    if (resolvedType === "TEXT" && resolvedOptions && resolvedOptions.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "TEXT question cannot have options",
      });
    }

    if ((resolvedType === "RADIO" || resolvedType === "CHECKBOX") && resolvedOptions) {
      if (resolvedOptions.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "At least 2 options are required",
        });
      }

      const correctCount = resolvedOptions.filter((option) => option.isCorrect).length;
      if (resolvedType === "RADIO" && correctCount !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "RADIO question must have exactly one correct option",
        });
      }

      if (resolvedType === "CHECKBOX" && correctCount < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "CHECKBOX question must have at least one correct option",
        });
      }
    }
  });

export type ExamQuestionIdParamInput = z.infer<typeof examQuestionIdParamSchema>;
export type UpdateExamQuestionInput = z.infer<typeof updateExamQuestionSchema>;
export type AddQuestionFromBankInput = z.infer<typeof addQuestionFromBankSchema>;
export type UpdateExamBasicInfoInput = z.infer<typeof updateExamBasicInfoSchema>;
export type UpdateExamStatusInput = z.infer<typeof updateExamStatusSchema>;
