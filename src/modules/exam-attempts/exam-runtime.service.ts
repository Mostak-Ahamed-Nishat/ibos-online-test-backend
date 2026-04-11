import { ApiError } from "../../utils/api-error";
import { ExamQuestionModel } from "../exams/exam-question.model";
import { ExamAttemptAnswerModel } from "./exam-answer.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import {
  buildStatusMap,
  calculateRemainingSeconds,
  sanitizeQuestion,
  submitExamAttempt,
  syncOfflineAttemptAnswers,
  validateSaveAnswer,
} from "./exam-runtime.helpers";
import type { OfflineSyncInput, UpdateCurrentQuestionInput } from "./exam-runtime.validation";

export class ExamRuntimeService {
  private async getActiveSession(examId: string, candidateUserId: string) {
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
      await attempt.save();
      throw new ApiError(409, "Session expired");
    }

    return attempt;
  }

  async getCurrentQuestion(examId: string, candidateUserId: string) {
    const attempt = await this.getActiveSession(examId, candidateUserId);

    const questions = await ExamQuestionModel.find({ examId }).sort({ order: 1 }).lean();
    if (questions.length === 0) {
      throw new ApiError(404, "No question found for this exam");
    }

    const currentOrder = Math.min(Math.max(attempt.currentQuestionOrder, 1), questions.length);
    const currentQuestion = questions.find((question) => question.order === currentOrder) ?? questions[0];

    const answer = await ExamAttemptAnswerModel.findOne({
      attemptId: attempt._id,
      questionId: currentQuestion._id,
    }).lean();

    return {
      attemptId: String(attempt._id),
      currentOrder: currentQuestion.order,
      totalQuestions: questions.length,
      remainingSeconds: calculateRemainingSeconds(attempt.expiresAt),
      question: sanitizeQuestion(currentQuestion),
      currentAnswer: answer
        ? {
            status: answer.status,
            selectedOptionIndexes: answer.selectedOptionIndexes ?? [],
            answerText: answer.answerText ?? "",
          }
        : null,
    };
  }

  async updateCurrentQuestion(
    examId: string,
    candidateUserId: string,
    payload: UpdateCurrentQuestionInput,
  ) {
    const attempt = await this.getActiveSession(examId, candidateUserId);
    const questions = await ExamQuestionModel.find({ examId }).sort({ order: 1 }).lean();
    if (questions.length === 0) {
      throw new ApiError(404, "No question found for this exam");
    }

    const currentOrder = Math.min(Math.max(attempt.currentQuestionOrder, 1), questions.length);
    const currentQuestion = questions.find((question) => question.order === currentOrder) ?? questions[0];

    const selectedIndexes = [...new Set(payload.selectedOptionIndexes)];
    if (payload.action === "SAVE") {
      validateSaveAnswer(currentQuestion, selectedIndexes, payload.answerText);
    }

    await ExamAttemptAnswerModel.findOneAndUpdate(
      { attemptId: attempt._id, questionId: currentQuestion._id },
      {
        $set: {
          examId,
          candidateId: candidateUserId,
          questionOrder: currentQuestion.order,
          status: payload.action === "SAVE" ? "ANSWERED" : "SKIPPED",
          selectedOptionIndexes: payload.action === "SAVE" ? selectedIndexes : [],
          answerText:
            payload.action === "SAVE" && currentQuestion.type === "TEXT" ? payload.answerText.trim() : "",
        },
      },
      { upsert: true, new: true },
    );

    const maxOrder = questions.length;
    let nextOrder = currentOrder < maxOrder ? currentOrder + 1 : currentOrder;
    if (payload.jumpToOrder !== undefined) {
      if (payload.jumpToOrder < 1 || payload.jumpToOrder > maxOrder) {
        throw new ApiError(400, "Invalid jumpToOrder value");
      }
      nextOrder = payload.jumpToOrder;
    }

    attempt.currentQuestionOrder = nextOrder;
    await attempt.save();

    return {
      savedOrder: currentQuestion.order,
      nextOrder,
      totalQuestions: maxOrder,
    };
  }

  async getNavigation(examId: string, candidateUserId: string) {
    const attempt = await this.getActiveSession(examId, candidateUserId);
    const questions = await ExamQuestionModel.find({ examId })
      .sort({ order: 1 })
      .select({ _id: 1, order: 1 })
      .lean();
    if (questions.length === 0) {
      throw new ApiError(404, "No question found for this exam");
    }

    const answers = await ExamAttemptAnswerModel.find({ attemptId: attempt._id })
      .select({ questionId: 1, status: 1 })
      .lean();
    const statusMap = buildStatusMap(questions, answers);

    const items = questions.map((question) => ({
      questionId: String(question._id),
      order: question.order,
      status: statusMap.get(String(question._id)) ?? "UNANSWERED",
      isCurrent: question.order === attempt.currentQuestionOrder,
    }));

    const summary = {
      total: items.length,
      answered: items.filter((item) => item.status === "ANSWERED").length,
      skipped: items.filter((item) => item.status === "SKIPPED").length,
      unanswered: items.filter((item) => item.status === "UNANSWERED").length,
    };

    return {
      currentOrder: attempt.currentQuestionOrder,
      items,
      summary,
    };
  }

  async getReview(examId: string, candidateUserId: string) {
    const navigation = await this.getNavigation(examId, candidateUserId);
    return {
      currentOrder: navigation.currentOrder,
      totalQuestions: navigation.summary.total,
      answeredCount: navigation.summary.answered,
      skippedCount: navigation.summary.skipped,
      unansweredCount: navigation.summary.unanswered,
      canSubmit: true,
      remainingQuestionCount: navigation.summary.unanswered,
    };
  }

  async submitExam(
    examId: string,
    candidateUserId: string,
    source: "MANUAL" | "AUTO_VIOLATION" | "AUTO_TIMEOUT" = "MANUAL",
  ) {
    return submitExamAttempt({
      examId,
      candidateUserId,
      source,
      getActiveSession: this.getActiveSession.bind(this),
    });
  }

  async timeoutSubmitExam(examId: string, candidateUserId: string) {
    return this.submitExam(examId, candidateUserId, "AUTO_TIMEOUT");
  }

  async syncOfflineAnswers(examId: string, candidateUserId: string, payload: OfflineSyncInput) {
    return syncOfflineAttemptAnswers({
      examId,
      candidateUserId,
      payload,
      getActiveSession: this.getActiveSession.bind(this),
    });
  }

  async getOfflineSyncState(examId: string, candidateUserId: string) {
    const attempt = await this.getActiveSession(examId, candidateUserId);
    const answers = await ExamAttemptAnswerModel.find({ attemptId: attempt._id })
      .select({
        questionOrder: 1,
        status: 1,
        selectedOptionIndexes: 1,
        answerText: 1,
        updatedAt: 1,
      })
      .sort({ questionOrder: 1 })
      .lean();

    return {
      attemptId: String(attempt._id),
      currentQuestionOrder: attempt.currentQuestionOrder,
      remainingSeconds: calculateRemainingSeconds(attempt.expiresAt),
      answers: answers.map((answer) => ({
        questionOrder: answer.questionOrder,
        status: answer.status,
        selectedOptionIndexes: answer.selectedOptionIndexes ?? [],
        answerText: answer.answerText ?? "",
        updatedAt: answer.updatedAt,
      })),
    };
  }
}

export const examRuntimeService = new ExamRuntimeService();
