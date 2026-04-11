import { ApiError } from "../../utils/api-error";
import { ExamQuestionModel } from "../exams/exam-question.model";
import { ExamModel } from "../exams/exam.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import { ExamAttemptAnswerModel } from "./exam-answer.model";
import type { OfflineSyncInput, UpdateCurrentQuestionInput } from "./exam-runtime.validation";

export class ExamRuntimeService {
  private sanitizeQuestion(question: Record<string, any>) {
    return {
      id: String(question._id),
      order: question.order,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      options: (question.options ?? []).map((option: Record<string, any>, index: number) => ({
        index,
        text: option.text,
      })),
    };
  }

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

  private buildStatusMap(
    questions: Array<Record<string, any>>,
    answers: Array<Record<string, any>>,
  ): Map<string, "ANSWERED" | "SKIPPED" | "UNANSWERED"> {
    const answerStatusMap = new Map<string, "ANSWERED" | "SKIPPED">();
    for (const answer of answers) {
      answerStatusMap.set(String(answer.questionId), answer.status);
    }

    const statusMap = new Map<string, "ANSWERED" | "SKIPPED" | "UNANSWERED">();
    for (const question of questions) {
      statusMap.set(String(question._id), answerStatusMap.get(String(question._id)) ?? "UNANSWERED");
    }

    return statusMap;
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

    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      attemptId: String(attempt._id),
      currentOrder: currentQuestion.order,
      totalQuestions: questions.length,
      remainingSeconds,
      question: this.sanitizeQuestion(currentQuestion),
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
      if (currentQuestion.type === "TEXT") {
        if (!payload.answerText.trim()) {
          throw new ApiError(400, "Text answer is required");
        }
      } else {
        if (selectedIndexes.length < 1) {
          throw new ApiError(400, "At least one option is required");
        }
        const maxIndex = (currentQuestion.options?.length ?? 0) - 1;
        const invalidIndex = selectedIndexes.some((value) => value < 0 || value > maxIndex);
        if (invalidIndex) {
          throw new ApiError(400, "Invalid option index provided");
        }
        if (currentQuestion.type === "RADIO" && selectedIndexes.length !== 1) {
          throw new ApiError(400, "RADIO answer must have exactly one option");
        }
      }
    }

    await ExamAttemptAnswerModel.findOneAndUpdate(
      {
        attemptId: attempt._id,
        questionId: currentQuestion._id,
      },
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
    const statusMap = this.buildStatusMap(questions, answers);

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
    const now = new Date();

    const attempt = await ExamAttemptModel.findOne({
      examId,
      candidateId: candidateUserId,
      status: "IN_PROGRESS",
    });
    if (!attempt) {
      throw new ApiError(404, "No active session found");
    }

    if (new Date(attempt.expiresAt) <= now && source !== "AUTO_TIMEOUT") {
      attempt.status = "TIMEOUT";
      attempt.submittedAt = now;
      attempt.submissionSource = "AUTO_TIMEOUT";
      attempt.resultStatus = "PENDING_EVALUATION";
      await attempt.save();
      throw new ApiError(409, "Session expired");
    }

    const exam = await ExamModel.findById(attempt.examId)
      .select({ immediateResultPublish: 1 })
      .lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }

    const questions = await ExamQuestionModel.find({ examId })
      .select({ _id: 1, type: 1, marks: 1, negativeMarks: 1, options: 1 })
      .lean();
    const answers = await ExamAttemptAnswerModel.find({ attemptId: attempt._id }).lean();
    const answerMap = new Map<string, Record<string, any>>(
      answers.map((answer) => [String(answer.questionId), answer]),
    );

    let objectiveScore = 0;
    let pendingTextEvaluationCount = 0;
    const objectiveUpdates: Array<ReturnType<typeof ExamAttemptAnswerModel.updateOne>> = [];

    for (const question of questions) {
      const answer = answerMap.get(String(question._id));

      if (question.type === "TEXT") {
        if (
          answer &&
          answer.status === "ANSWERED" &&
          typeof answer.answerText === "string" &&
          answer.answerText.trim().length > 0
        ) {
          pendingTextEvaluationCount += 1;
          objectiveUpdates.push(
            ExamAttemptAnswerModel.updateOne(
              { _id: answer._id },
              {
                $set: {
                  isManualEvaluated: false,
                  manualAwardedMarks: 0,
                },
              },
            ),
          );
        }
        continue;
      }

      if (!answer || answer.status !== "ANSWERED") {
        continue;
      }

      const selected = [...new Set((answer.selectedOptionIndexes ?? []) as number[])].sort(
        (a: number, b: number) => a - b,
      );
      const correct = (question.options ?? [])
        .map((option: Record<string, any>, index: number) => (option.isCorrect ? index : -1))
        .filter((index: number) => index >= 0)
        .sort((a: number, b: number) => a - b);

      let isCorrect = false;
      if (question.type === "RADIO") {
        isCorrect = selected.length === 1 && correct.length === 1 && selected[0] === correct[0];
      } else if (question.type === "CHECKBOX") {
        isCorrect =
          selected.length === correct.length &&
          selected.every((selectedIndex, index) => selectedIndex === correct[index]);
      }

      const awarded = isCorrect ? question.marks : selected.length > 0 ? -question.negativeMarks : 0;
      objectiveScore += awarded;

      objectiveUpdates.push(
        ExamAttemptAnswerModel.updateOne(
          { _id: answer._id },
          {
            $set: {
              objectiveAwardedMarks: awarded,
              isObjectiveCorrect: isCorrect,
            },
          },
        ),
      );
    }

    if (objectiveUpdates.length > 0) {
      await Promise.all(objectiveUpdates.map((operation) => operation.exec()));
    }

    const hasPendingTextEvaluation = pendingTextEvaluationCount > 0;
    const isImmediatePublish = Boolean((exam as Record<string, unknown>).immediateResultPublish);

    let resultStatus: "PENDING_EVALUATION" | "READY" | "PUBLISHED" = "READY";
    let publishedAt: Date | null = null;

    if (hasPendingTextEvaluation) {
      resultStatus = "PENDING_EVALUATION";
    } else if (isImmediatePublish) {
      resultStatus = "PUBLISHED";
      publishedAt = now;
    }

    attempt.status = source === "AUTO_TIMEOUT" ? "TIMEOUT" : "SUBMITTED";
    attempt.submittedAt = now;
    attempt.submissionSource = source;
    attempt.objectiveScore = objectiveScore;
    attempt.textScore = 0;
    attempt.totalScore = objectiveScore;
    attempt.resultStatus = resultStatus;
    attempt.publishedAt = publishedAt;

    await attempt.save();

    return {
      attemptId: String(attempt._id),
      status: attempt.status,
      objectiveScore: attempt.objectiveScore,
      textScore: attempt.textScore,
      totalScore: attempt.totalScore,
      pendingTextEvaluationCount,
      resultStatus: attempt.resultStatus,
      isResultPublished: attempt.resultStatus === "PUBLISHED",
      submittedAt: attempt.submittedAt,
    };
  }

  async timeoutSubmitExam(examId: string, candidateUserId: string) {
    return this.submitExam(examId, candidateUserId, "AUTO_TIMEOUT");
  }

  async syncOfflineAnswers(examId: string, candidateUserId: string, payload: OfflineSyncInput) {
    const attempt = await this.getActiveSession(examId, candidateUserId);
    const questions = await ExamQuestionModel.find({ examId }).sort({ order: 1 }).lean();
    if (questions.length === 0) {
      throw new ApiError(404, "No question found for this exam");
    }

    const questionByOrder = new Map<number, Record<string, any>>(
      questions.map((question) => [question.order, question]),
    );

    const ops: Array<ReturnType<typeof ExamAttemptAnswerModel.updateOne>> = [];
    let syncedCount = 0;

    for (const item of payload.items) {
      const question = questionByOrder.get(item.questionOrder);
      if (!question) {
        continue;
      }

      const selectedIndexes = [...new Set(item.selectedOptionIndexes)];

      if (item.action === "SAVE") {
        if (question.type === "TEXT") {
          if (!item.answerText.trim()) {
            continue;
          }
        } else {
          if (selectedIndexes.length < 1) {
            continue;
          }
          const maxIndex = (question.options?.length ?? 0) - 1;
          const invalidIndex = selectedIndexes.some((value) => value < 0 || value > maxIndex);
          if (invalidIndex) {
            continue;
          }
          if (question.type === "RADIO" && selectedIndexes.length !== 1) {
            continue;
          }
        }
      }

      ops.push(
        ExamAttemptAnswerModel.updateOne(
          { attemptId: attempt._id, questionId: question._id },
          {
            $set: {
              examId,
              candidateId: candidateUserId,
              questionOrder: question.order,
              status: item.action === "SAVE" ? "ANSWERED" : "SKIPPED",
              selectedOptionIndexes: item.action === "SAVE" ? selectedIndexes : [],
              answerText: item.action === "SAVE" && question.type === "TEXT" ? item.answerText.trim() : "",
            },
          },
          { upsert: true },
        ),
      );
      syncedCount += 1;
    }

    if (ops.length > 0) {
      await Promise.all(ops.map((op) => op.exec()));
    }

    if (payload.currentQuestionOrder !== undefined) {
      const maxOrder = questions.length;
      attempt.currentQuestionOrder = Math.min(Math.max(payload.currentQuestionOrder, 1), maxOrder);
      await attempt.save();
    }

    return {
      attemptId: String(attempt._id),
      syncedCount,
      currentQuestionOrder: attempt.currentQuestionOrder,
    };
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

    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      attemptId: String(attempt._id),
      currentQuestionOrder: attempt.currentQuestionOrder,
      remainingSeconds,
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
