import { ApiError } from "../../utils/api-error";
import { ExamModel } from "../exams/exam.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import { ExamIntegrityEventModel } from "./exam-integrity-event.model";
import { examRuntimeService } from "./exam-runtime.service";
import type { ReportIntegrityEventInput } from "./exam-integrity.validation";

export class ExamIntegrityService {
  async reportEvent(examId: string, candidateUserId: string, payload: ReportIntegrityEventInput) {
    const [exam, attempt] = await Promise.all([
      ExamModel.findById(examId)
        .select({ maxViolationLimit: 1, status: 1 })
        .lean(),
      ExamAttemptModel.findOne({
        examId,
        candidateId: candidateUserId,
        status: "IN_PROGRESS",
      }).lean(),
    ]);

    if (!exam || exam.status !== "PUBLISHED") {
      throw new ApiError(403, "Exam is not available");
    }

    if (!attempt) {
      throw new ApiError(404, "No active session found");
    }

    const now = new Date();
    if (new Date(attempt.expiresAt) <= now) {
      await ExamAttemptModel.updateOne(
        { _id: attempt._id, status: "IN_PROGRESS" },
        {
          $set: {
            status: "TIMEOUT",
            submittedAt: now,
            submissionSource: "AUTO_TIMEOUT",
            resultStatus: "PENDING_EVALUATION",
          },
        },
      );
      throw new ApiError(409, "Session expired");
    }

    const priorViolationCount = await ExamIntegrityEventModel.countDocuments({
      attemptId: attempt._id,
    });
    const violationCountAfter = priorViolationCount + 1;

    await ExamIntegrityEventModel.create({
      examId,
      attemptId: attempt._id,
      candidateId: candidateUserId,
      eventType: payload.eventType,
      violationCountAfter,
      metadata: payload.metadata,
    });

    const maxViolationLimit = exam.maxViolationLimit ?? 3;
    const shouldAutoSubmit = violationCountAfter >= maxViolationLimit;

    if (!shouldAutoSubmit) {
      return {
        autoSubmitted: false,
        violationCount: violationCountAfter,
        maxViolationLimit,
        remainingViolations: Math.max(0, maxViolationLimit - violationCountAfter),
      };
    }

    const submitResult = await examRuntimeService.submitExam(examId, candidateUserId, "AUTO_VIOLATION");
    return {
      autoSubmitted: true,
      violationCount: violationCountAfter,
      maxViolationLimit,
      remainingViolations: 0,
      submission: submitResult,
    };
  }
}

export const examIntegrityService = new ExamIntegrityService();

