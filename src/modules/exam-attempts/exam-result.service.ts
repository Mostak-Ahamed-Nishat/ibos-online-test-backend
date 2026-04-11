import { ApiError } from "../../utils/api-error";
import { ExamModel } from "../exams/exam.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import type { CandidateResultListQueryInput } from "./exam-result.validation";

type CandidateResultVisibility =
  | "NOT_AVAILABLE"
  | "IN_PROGRESS"
  | "PENDING_EVALUATION"
  | "NOT_PUBLISHED"
  | "PUBLISHED";

export class ExamResultService {
  private mapVisibility(attempt: Record<string, any> | null): CandidateResultVisibility {
    if (!attempt) {
      return "NOT_AVAILABLE";
    }

    if (attempt.status === "IN_PROGRESS") {
      return "IN_PROGRESS";
    }

    if (attempt.resultStatus === "PENDING_EVALUATION") {
      return "PENDING_EVALUATION";
    }

    if (attempt.resultStatus === "PUBLISHED") {
      return "PUBLISHED";
    }

    return "NOT_PUBLISHED";
  }

  private mapAttemptResult(exam: Record<string, any>, attempt: Record<string, any> | null) {
    const visibilityStatus = this.mapVisibility(attempt);
    const isPublished = visibilityStatus === "PUBLISHED";

    return {
      examId: String(exam._id),
      examTitle: exam.title,
      attemptLimit: exam.attemptLimit,
      immediateResultPublish: exam.immediateResultPublish,
      visibilityStatus,
      latestAttempt: attempt
        ? {
            attemptId: String(attempt._id),
            attemptNo: attempt.attemptNo,
            status: attempt.status,
            resultStatus: attempt.resultStatus,
            submittedAt: attempt.submittedAt,
            publishedAt: attempt.publishedAt,
          }
        : null,
      score: isPublished
        ? {
            objectiveScore: attempt?.objectiveScore ?? 0,
            textScore: attempt?.textScore ?? 0,
            totalScore: attempt?.totalScore ?? 0,
          }
        : null,
    };
  }

  async getExamResult(examId: string, candidateUserId: string) {
    const exam = await ExamModel.findById(examId)
      .select({ _id: 1, title: 1, attemptLimit: 1, immediateResultPublish: 1 })
      .lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    const attempt = await ExamAttemptModel.findOne({ examId, candidateId: candidateUserId })
      .sort({ attemptNo: -1 })
      .lean();

    return this.mapAttemptResult(exam, attempt);
  }

  async listResults(query: CandidateResultListQueryInput, candidateUserId: string) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const attempts = await ExamAttemptModel.find({ candidateId: candidateUserId })
      .sort({ examId: 1, attemptNo: -1 })
      .select({
        examId: 1,
        attemptNo: 1,
        status: 1,
        resultStatus: 1,
        submittedAt: 1,
        publishedAt: 1,
        objectiveScore: 1,
        textScore: 1,
        totalScore: 1,
      })
      .lean();

    const latestAttemptByExam = new Map<string, Record<string, any>>();
    for (const attempt of attempts) {
      const examId = String(attempt.examId);
      if (!latestAttemptByExam.has(examId)) {
        latestAttemptByExam.set(examId, attempt);
      }
    }

    const examIds = [...latestAttemptByExam.keys()];
    if (examIds.length === 0) {
      return {
        items: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 1,
        },
      };
    }

    const exams = await ExamModel.find({ _id: { $in: examIds } })
      .select({ _id: 1, title: 1, attemptLimit: 1, immediateResultPublish: 1 })
      .lean();
    const examMap = new Map<string, Record<string, any>>(exams.map((exam) => [String(exam._id), exam]));

    const allItems = examIds
      .map((examId) => {
        const exam = examMap.get(examId);
        const attempt = latestAttemptByExam.get(examId) ?? null;
        if (!exam) {
          return null;
        }
        return this.mapAttemptResult(exam, attempt);
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = allItems.slice(skip, skip + limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

export const examResultService = new ExamResultService();

