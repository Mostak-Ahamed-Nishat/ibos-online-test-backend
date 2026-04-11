import { ApiError } from "../../utils/api-error";
import { ExamModel } from "../exams/exam.model";
import { ExamAttemptModel } from "./exam-attempt.model";

export class ExamAttemptService {
  private toSessionResponse(
    attempt: Record<string, any>,
    exam: Record<string, any>,
    message: string,
    resumed: boolean,
  ) {
    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      message,
      resumed,
      session: {
        attemptId: String(attempt._id),
        examId: String(exam._id),
        status: attempt.status,
        attemptNo: attempt.attemptNo,
        maxAttempts: exam.attemptLimit,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds,
      },
    };
  }

  async startExam(examId: string, candidateUserId: string) {
    const now = new Date();

    const exam = await ExamModel.findById(examId)
      .select({
        status: 1,
        startTime: 1,
        endTime: 1,
        durationMinutes: 1,
        attemptLimit: 1,
      })
      .lean();
    if (!exam || exam.status !== "PUBLISHED") {
      throw new ApiError(403, "Exam is not available");
    }

    if (new Date(exam.startTime) > now) {
      throw new ApiError(409, "Exam has not started yet");
    }

    if (new Date(exam.endTime) <= now) {
      throw new ApiError(409, "Exam has already ended");
    }

    const existing = await ExamAttemptModel.findOne({
      examId,
      candidateId: candidateUserId,
      status: "IN_PROGRESS",
    });

    if (existing) {
      if (new Date(existing.expiresAt) <= now) {
        existing.status = "TIMEOUT";
        existing.submittedAt = now;
        existing.submissionSource = "AUTO_TIMEOUT";
        await existing.save();
      } else {
        return this.toSessionResponse(existing.toObject(), exam, "Exam session resumed", true);
      }
    }

    const usedAttempts = await ExamAttemptModel.countDocuments({
      examId,
      candidateId: candidateUserId,
    });

    if (usedAttempts >= exam.attemptLimit) {
      if (exam.attemptLimit === 1) {
        throw new ApiError(409, "You already attempted this exam");
      }
      throw new ApiError(409, "You have reached the maximum attempt limit for this exam");
    }

    const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

    const attempt = await ExamAttemptModel.create({
      examId,
      candidateId: candidateUserId,
      attemptNo: usedAttempts + 1,
      status: "IN_PROGRESS",
      startedAt: now,
      expiresAt,
    });

    return this.toSessionResponse(attempt.toObject(), exam, "Exam session started", false);
  }

  async getCurrentSession(examId: string, candidateUserId: string) {
    const exam = await ExamModel.findById(examId)
      .select({
        attemptLimit: 1,
      })
      .lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    const now = new Date();
    const attempt = await ExamAttemptModel.findOne({
      examId,
      candidateId: candidateUserId,
      status: "IN_PROGRESS",
    });

    if (!attempt) {
      throw new ApiError(404, "No active session found");
    }

    if (new Date(attempt.expiresAt) <= now) {
      attempt.status = "TIMEOUT";
      attempt.submittedAt = now;
      attempt.submissionSource = "AUTO_TIMEOUT";
      await attempt.save();
      throw new ApiError(409, "Session expired");
    }

    return this.toSessionResponse(attempt.toObject(), exam, "Exam session fetched", true);
  }
}

export const examAttemptService = new ExamAttemptService();
