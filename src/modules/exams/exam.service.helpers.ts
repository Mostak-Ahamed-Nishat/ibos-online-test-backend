import { ApiError } from "../../utils/api-error";
import { ExamQuestionModel } from "./exam-question.model";
import { ExamModel } from "./exam.model";

type ExamLike = Record<string, any>;
type QuestionLike = Record<string, any>;

export function buildPromptKey(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapExam(exam: ExamLike) {
  return {
    id: String(exam._id),
    title: exam.title,
    totalCandidates: exam.totalCandidates,
    totalSlots: exam.totalSlots,
    totalQuestionSet: exam.totalQuestionSet,
    questionType: exam.questionType,
    startTime: exam.startTime,
    endTime: exam.endTime,
    durationMinutes: exam.durationMinutes,
    attemptLimit: exam.attemptLimit,
    immediateResultPublish: exam.immediateResultPublish,
    maxViolationLimit: exam.maxViolationLimit,
    passThreshold: exam.passThreshold,
    status: exam.status,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

export function mapExamQuestion(question: QuestionLike) {
  return {
    id: String(question._id),
    examId: String(question.examId),
    sourceType: question.sourceType,
    bankQuestionId: question.bankQuestionId ? String(question.bankQuestionId) : null,
    prompt: question.prompt,
    type: question.type,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    options: question.options,
    order: question.order,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

export function assertExamWindow(startTime: Date, endTime: Date): void {
  if (endTime <= startTime) {
    throw new ApiError(400, "End time must be after start time");
  }
}

export function assertQuestionOptions(
  questionType: "RADIO" | "CHECKBOX" | "TEXT",
  options: Array<{ isCorrect: boolean }>,
): void {
  if (questionType === "TEXT" && options.length > 0) {
    throw new ApiError(400, "TEXT question cannot have options");
  }

  if ((questionType === "RADIO" || questionType === "CHECKBOX") && options.length < 2) {
    throw new ApiError(400, "At least 2 options are required");
  }

  const correctCount = options.filter((option) => option.isCorrect).length;
  if (questionType === "RADIO" && correctCount !== 1) {
    throw new ApiError(400, "RADIO question must have exactly one correct option");
  }
  if (questionType === "CHECKBOX" && correctCount < 1) {
    throw new ApiError(400, "CHECKBOX question must have at least one correct option");
  }
}

export async function ensureExamForAdmin(examId: string, adminUserId: string) {
  const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId });
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }
  return exam;
}

export async function ensureExamForAdminLean(examId: string, adminUserId: string) {
  const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId }).lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }
  return exam;
}

export async function getNextQuestionOrder(examId: string) {
  const lastQuestion = await ExamQuestionModel.findOne({ examId })
    .sort({ order: -1 })
    .select({ order: 1 })
    .lean();
  return (lastQuestion?.order ?? 0) + 1;
}
