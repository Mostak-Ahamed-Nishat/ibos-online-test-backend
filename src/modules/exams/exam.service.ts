import { ApiError } from "../../utils/api-error";
import { ExamModel } from "./exam.model";
import { ExamQuestionModel } from "./exam-question.model";
import type {
  AddExamQuestionInput,
  CreateExamBasicInfoInput,
  ListExamQueryInput,
} from "./exam.validation";

export class ExamService {
  async createBasicInfo(payload: CreateExamBasicInfoInput, adminUserId: string) {
    const start = new Date(payload.startTime);
    const end = new Date(payload.endTime);

    if (end <= start) {
      throw new ApiError(400, "End time must be after start time");
    }

    const exam = await ExamModel.create({
      title: payload.title,
      totalCandidates: payload.totalCandidates,
      totalSlots: payload.totalSlots,
      totalQuestionSet: payload.totalQuestionSet,
      questionType: payload.questionType,
      startTime: start,
      endTime: end,
      durationMinutes: payload.durationMinutes,
      status: "DRAFT",
      createdBy: adminUserId,
    });

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
      status: exam.status,
    };
  }

  async listExams(query: ListExamQueryInput, adminUserId: string) {
    const searchValue = String(query.search ?? "").trim();
    const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit =
      Number.isInteger(query.limit) && query.limit > 0 && query.limit <= 100
        ? query.limit
        : 8;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      createdBy: adminUserId,
    };

    if (searchValue) {
      filter.title = { $regex: searchValue, $options: "i" };
    }

    const [items, total] = await Promise.all([
      ExamModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          totalCandidates: 1,
          totalSlots: 1,
          totalQuestionSet: 1,
          questionType: 1,
          startTime: 1,
          endTime: 1,
          durationMinutes: 1,
          status: 1,
          createdAt: 1,
        })
        .lean(),
      ExamModel.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: items.map((exam) => ({
        id: String(exam._id),
        title: exam.title,
        totalCandidates: exam.totalCandidates,
        totalSlots: exam.totalSlots,
        totalQuestionSet: exam.totalQuestionSet,
        questionType: exam.questionType,
        startTime: exam.startTime,
        endTime: exam.endTime,
        durationMinutes: exam.durationMinutes,
        status: exam.status,
        createdAt: exam.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async addQuestion(payload: AddExamQuestionInput, examId: string, adminUserId: string) {
    const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId }).lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    const lastQuestion = await ExamQuestionModel.findOne({ examId })
      .sort({ order: -1 })
      .select({ order: 1 })
      .lean();
    const nextOrder = (lastQuestion?.order ?? 0) + 1;

    const question = await ExamQuestionModel.create({
      examId,
      prompt: payload.prompt,
      type: payload.type,
      marks: payload.marks,
      negativeMarks: payload.negativeMarks ?? 0,
      options: payload.options,
      order: nextOrder,
      createdBy: adminUserId,
    });

    return {
      id: String(question._id),
      examId: String(question.examId),
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      order: question.order,
    };
  }

  async listQuestions(examId: string, adminUserId: string) {
    const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId }).lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    const items = await ExamQuestionModel.find({ examId })
      .sort({ order: 1 })
      .lean();

    return items.map((question) => ({
      id: String(question._id),
      examId: String(question.examId),
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: question.options,
      order: question.order,
      createdAt: question.createdAt,
    }));
  }
}

export const examService = new ExamService();
