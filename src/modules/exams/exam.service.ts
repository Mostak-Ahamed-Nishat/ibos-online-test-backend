import { ApiError } from "../../utils/api-error";
import { ExamModel } from "./exam.model";
import type { CreateExamBasicInfoInput } from "./exam.validation";

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
}

export const examService = new ExamService();
