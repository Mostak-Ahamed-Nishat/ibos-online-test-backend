import { z } from "zod";

const normalizeEnumInput = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  return value.trim().toUpperCase();
};

const optionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});

export const questionIdParamSchema = z.object({
  questionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid question id"),
});

export const createQuestionSchema = z
  .object({
    bankName: z.string().trim().min(1).max(120).optional().default("General"),
    prompt: z.string().trim().min(1),
    type: z.preprocess(normalizeEnumInput, z.enum(["RADIO", "CHECKBOX", "TEXT"])),
    marks: z.number().min(0),
    negativeMarks: z.number().min(0).optional().default(0),
    options: z.array(optionSchema).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "TEXT") {
      if (value.options.length > 0) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "TEXT question cannot have options" });
      }
      return;
    }

    if (value.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "At least 2 options are required" });
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

export const listQuestionQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  bankName: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const updateQuestionSchema = z
  .object({
    bankName: z.string().trim().min(1).max(120).optional(),
    prompt: z.string().trim().min(1).optional(),
    type: z.preprocess(normalizeEnumInput, z.enum(["RADIO", "CHECKBOX", "TEXT"])).optional(),
    marks: z.number().min(0).optional(),
    negativeMarks: z.number().min(0).optional(),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.bankName === undefined &&
      value.prompt === undefined &&
      value.type === undefined &&
      value.marks === undefined &&
      value.negativeMarks === undefined &&
      value.options === undefined
    ) {
      ctx.addIssue({ code: "custom", path: [], message: "At least one field is required for update" });
    }
  });

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type ListQuestionQueryInput = z.infer<typeof listQuestionQuerySchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type QuestionIdParamInput = z.infer<typeof questionIdParamSchema>;
