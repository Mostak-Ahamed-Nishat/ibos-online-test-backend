import { ApiError } from "../../utils/api-error";
import { ExamModel } from "../exams/exam.model";
import type {
  CandidateExamListQueryInput,
} from "./exam-candidate.validation";

export class ExamCandidateService {
  async listCandidateExams(query: CandidateExamListQueryInput) {
    const searchValue = query.search.trim();
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter: Record<string, unknown> = {
      status: "PUBLISHED",
      endTime: { $gt: now },
    };

    if (searchValue) {
      filter.title = { $regex: searchValue, $options: "i" };
    }

    const [items, total] = await Promise.all([
      ExamModel.find(filter)
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          durationMinutes: 1,
          totalQuestionSet: 1,
          questionType: 1,
          startTime: 1,
          endTime: 1,
          attemptLimit: 1,
          immediateResultPublish: 1,
          maxViolationLimit: 1,
          passThreshold: 1,
        })
        .lean(),
      ExamModel.countDocuments(filter),
    ]);

    const mapped = items.map((exam) => {
      const examStart = new Date(exam.startTime);
      const availabilityStatus = examStart > now ? "UPCOMING" : "LIVE";

      return {
        examId: String(exam._id),
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalQuestionSet: exam.totalQuestionSet,
        questionType: exam.questionType,
        startTime: exam.startTime,
        endTime: exam.endTime,
        attemptLimit: exam.attemptLimit,
        immediateResultPublish: exam.immediateResultPublish,
        maxViolationLimit: exam.maxViolationLimit,
        passThreshold: exam.passThreshold,
        availabilityStatus,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getCandidateExamInstructions(examId: string) {
    const exam = await ExamModel.findById(examId)
      .select({
        title: 1,
        questionType: 1,
        durationMinutes: 1,
        totalQuestionSet: 1,
        startTime: 1,
        endTime: 1,
        attemptLimit: 1,
        immediateResultPublish: 1,
        maxViolationLimit: 1,
        passThreshold: 1,
        status: 1,
      })
      .lean();
    if (!exam || exam.status !== "PUBLISHED") {
      throw new ApiError(403, "Exam is not available");
    }

    if (new Date(exam.endTime) <= new Date()) {
      throw new ApiError(409, "Exam has already ended");
    }

    return {
      examId: String(exam._id),
      title: exam.title,
      questionType: exam.questionType,
      durationMinutes: exam.durationMinutes,
      totalQuestionSet: exam.totalQuestionSet,
      startTime: exam.startTime,
      endTime: exam.endTime,
      attemptLimit: exam.attemptLimit,
      immediateResultPublish: exam.immediateResultPublish,
      maxViolationLimit: exam.maxViolationLimit,
      passThreshold: exam.passThreshold,
      instructions: [
        "Read all questions carefully before submitting.",
        "Do not refresh the page during the exam session.",
        "Your answers are auto-saved, but submit before time ends.",
      ],
    };
  }
}

export const examCandidateService = new ExamCandidateService();
