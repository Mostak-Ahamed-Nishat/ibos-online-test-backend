import { Types } from "mongoose";
import { ApiError } from "../../utils/api-error";
import { UserModel } from "../auth/models/user.model";
import { ExamModel } from "../exams/exam.model";
import { ExamQuestionModel } from "../exams/exam-question.model";
import { ExamAttemptAnswerModel } from "./exam-answer.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import type { GradeTextAnswersInput, ListAttemptQueryInput } from "./exam-evaluation.validation";

export class ExamEvaluationService {
  private async ensureExamOwnership(examId: string, adminUserId: string) {
    const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId })
      .select({ _id: 1 })
      .lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }
    return exam;
  }

  private async getAttemptOrThrow(examId: string, attemptId: string) {
    const attempt = await ExamAttemptModel.findOne({ _id: attemptId, examId });
    if (!attempt) {
      throw new ApiError(404, "Attempt not found");
    }
    return attempt;
  }

  private async calculateAttemptProgress(examId: string, attemptId: string) {
    const [questions, answers] = await Promise.all([
      ExamQuestionModel.find({ examId }).select({ _id: 1, type: 1 }).lean(),
      ExamAttemptAnswerModel.find({ attemptId })
        .select({
          questionId: 1,
          status: 1,
          answerText: 1,
          objectiveAwardedMarks: 1,
          manualAwardedMarks: 1,
          isManualEvaluated: 1,
        })
        .lean(),
    ]);

    const questionTypeMap = new Map<string, "RADIO" | "CHECKBOX" | "TEXT">(
      questions.map((question) => [String(question._id), question.type]),
    );

    let objectiveScore = 0;
    let textScore = 0;
    let pendingTextEvaluationCount = 0;

    for (const answer of answers) {
      const questionType = questionTypeMap.get(String(answer.questionId));
      if (!questionType) {
        continue;
      }

      if (questionType === "TEXT") {
        const hasTextAnswer =
          answer.status === "ANSWERED" &&
          typeof answer.answerText === "string" &&
          answer.answerText.trim().length > 0;
        if (hasTextAnswer && !answer.isManualEvaluated) {
          pendingTextEvaluationCount += 1;
        }
        if (hasTextAnswer && answer.isManualEvaluated) {
          textScore += answer.manualAwardedMarks ?? 0;
        }
      } else {
        objectiveScore += answer.objectiveAwardedMarks ?? 0;
      }
    }

    return {
      objectiveScore,
      textScore,
      totalScore: objectiveScore + textScore,
      pendingTextEvaluationCount,
    };
  }

  private async syncAttemptScoresAndStatus(attempt: any, examId: string, publishNow = false) {
    const progress = await this.calculateAttemptProgress(examId, String(attempt._id));

    attempt.objectiveScore = progress.objectiveScore;
    attempt.textScore = progress.textScore;
    attempt.totalScore = progress.totalScore;

    if (progress.pendingTextEvaluationCount > 0) {
      attempt.resultStatus = "PENDING_EVALUATION";
      attempt.publishedAt = null;
    } else if (publishNow) {
      attempt.resultStatus = "PUBLISHED";
      attempt.publishedAt = new Date();
    } else if (attempt.resultStatus !== "PUBLISHED") {
      attempt.resultStatus = "READY";
      attempt.publishedAt = null;
    }

    await attempt.save();

    return {
      objectiveScore: attempt.objectiveScore,
      textScore: attempt.textScore,
      totalScore: attempt.totalScore,
      pendingTextEvaluationCount: progress.pendingTextEvaluationCount,
      resultStatus: attempt.resultStatus,
      publishedAt: attempt.publishedAt,
    };
  }

  async listAttempts(query: ListAttemptQueryInput, examId: string, adminUserId: string) {
    await this.ensureExamOwnership(examId, adminUserId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const searchValue = query.search.trim();

    const baseMatch: Record<string, unknown> = {
      examId: new Types.ObjectId(examId),
    };
    if (query.resultStatus) {
      baseMatch.resultStatus = query.resultStatus;
    }
    if (query.status) {
      baseMatch.status = query.status;
    } else {
      baseMatch.status = "SUBMITTED";
    }

    const searchMatch =
      searchValue.length > 0
        ? {
            $or: [
              { "candidate.fullName": { $regex: searchValue, $options: "i" } },
              { "candidate.email": { $regex: searchValue, $options: "i" } },
              { "candidate.studentId": { $regex: searchValue, $options: "i" } },
            ],
          }
        : {};

    const [result] = await ExamAttemptModel.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: "users",
          localField: "candidateId",
          foreignField: "_id",
          as: "candidate",
        },
      },
      { $unwind: "$candidate" },
      { $match: searchMatch },
      { $sort: { submittedAt: -1, createdAt: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const items = (result?.items ?? []).map((item: any) => ({
      attemptId: String(item._id),
      candidateId: String(item.candidateId),
      candidate: {
        studentId: item.candidate.studentId,
        fullName: item.candidate.fullName,
        email: item.candidate.email,
      },
      attemptNo: item.attemptNo,
      status: item.status,
      resultStatus: item.resultStatus,
      objectiveScore: item.objectiveScore,
      textScore: item.textScore,
      totalScore: item.totalScore,
      submittedAt: item.submittedAt,
      publishedAt: item.publishedAt,
    }));

    const total = result?.totalCount?.[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const breakdown = await ExamAttemptModel.aggregate([
      { $match: { examId: new Types.ObjectId(examId), status: "SUBMITTED" } },
      {
        $group: {
          _id: "$resultStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      submittedCount: await ExamAttemptModel.countDocuments({
        examId,
        status: "SUBMITTED",
      }),
      pendingEvaluationCount:
        breakdown.find((item) => item._id === "PENDING_EVALUATION")?.count ?? 0,
      readyCount: breakdown.find((item) => item._id === "READY")?.count ?? 0,
      publishedCount: breakdown.find((item) => item._id === "PUBLISHED")?.count ?? 0,
    };

    return {
      items,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getAttemptDetail(examId: string, attemptId: string, adminUserId: string) {
    await this.ensureExamOwnership(examId, adminUserId);
    const attempt = await this.getAttemptOrThrow(examId, attemptId);

    const [candidate, questions, answers] = await Promise.all([
      UserModel.findById(attempt.candidateId).select({ studentId: 1, fullName: 1, email: 1 }).lean(),
      ExamQuestionModel.find({ examId })
        .sort({ order: 1 })
        .select({
          _id: 1,
          order: 1,
          prompt: 1,
          type: 1,
          marks: 1,
          negativeMarks: 1,
          options: 1,
        })
        .lean(),
      ExamAttemptAnswerModel.find({ attemptId }).lean(),
    ]);

    const answerMap = new Map<string, any>(answers.map((answer) => [String(answer.questionId), answer]));

    const questionDetails = questions.map((question) => {
      const answer = answerMap.get(String(question._id));

      return {
        questionId: String(question._id),
        order: question.order,
        prompt: question.prompt,
        type: question.type,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        options: (question.options ?? []).map((option: any, index: number) => ({
          index,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        answer: answer
          ? {
              status: answer.status,
              selectedOptionIndexes: answer.selectedOptionIndexes ?? [],
              answerText: answer.answerText ?? "",
              objectiveAwardedMarks: answer.objectiveAwardedMarks ?? 0,
              isObjectiveCorrect: answer.isObjectiveCorrect,
              manualAwardedMarks: answer.manualAwardedMarks ?? 0,
              isManualEvaluated: answer.isManualEvaluated ?? false,
            }
          : null,
      };
    });

    return {
      attempt: {
        attemptId: String(attempt._id),
        attemptNo: attempt.attemptNo,
        status: attempt.status,
        resultStatus: attempt.resultStatus,
        objectiveScore: attempt.objectiveScore,
        textScore: attempt.textScore,
        totalScore: attempt.totalScore,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        publishedAt: attempt.publishedAt,
      },
      candidate: candidate
        ? {
            id: String(candidate._id),
            studentId: candidate.studentId,
            fullName: candidate.fullName,
            email: candidate.email,
          }
        : null,
      questions: questionDetails,
    };
  }

  async gradeTextAnswers(
    payload: GradeTextAnswersInput,
    examId: string,
    attemptId: string,
    adminUserId: string,
  ) {
    await this.ensureExamOwnership(examId, adminUserId);
    const attempt = await this.getAttemptOrThrow(examId, attemptId);

    if (attempt.status !== "SUBMITTED") {
      throw new ApiError(409, "Only submitted attempts can be evaluated");
    }

    const updates = payload.items;
    const questionIds = updates.map((item) => item.questionId);
    const [questions, answers] = await Promise.all([
      ExamQuestionModel.find({ _id: { $in: questionIds }, examId })
        .select({ _id: 1, type: 1, marks: 1 })
        .lean(),
      ExamAttemptAnswerModel.find({ attemptId, questionId: { $in: questionIds } })
        .select({ _id: 1, questionId: 1, status: 1, answerText: 1 })
        .lean(),
    ]);

    if (questions.length !== updates.length) {
      throw new ApiError(400, "One or more questions are invalid for this exam");
    }

    const questionMap = new Map<string, any>(questions.map((question) => [String(question._id), question]));
    const answerMap = new Map<string, any>(answers.map((answer) => [String(answer.questionId), answer]));

    const ops: Array<ReturnType<typeof ExamAttemptAnswerModel.updateOne>> = [];

    for (const item of updates) {
      const question = questionMap.get(item.questionId);
      if (!question || question.type !== "TEXT") {
        throw new ApiError(400, "Manual marks can be set only for TEXT questions");
      }
      if (item.manualAwardedMarks > question.marks) {
        throw new ApiError(400, `Manual marks cannot exceed question marks for question ${item.questionId}`);
      }

      const answer = answerMap.get(item.questionId);
      if (
        !answer ||
        answer.status !== "ANSWERED" ||
        typeof answer.answerText !== "string" ||
        answer.answerText.trim().length === 0
      ) {
        throw new ApiError(400, `No written answer found for question ${item.questionId}`);
      }

      ops.push(
        ExamAttemptAnswerModel.updateOne(
          { _id: answer._id },
          {
            $set: {
              manualAwardedMarks: item.manualAwardedMarks,
              isManualEvaluated: true,
            },
          },
        ),
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops.map((op) => op.exec()));
    }

    const score = await this.syncAttemptScoresAndStatus(attempt, examId, false);
    return {
      attemptId: String(attempt._id),
      ...score,
    };
  }

  async markEvaluated(examId: string, attemptId: string, adminUserId: string) {
    await this.ensureExamOwnership(examId, adminUserId);
    const attempt = await this.getAttemptOrThrow(examId, attemptId);
    if (attempt.status !== "SUBMITTED") {
      throw new ApiError(409, "Only submitted attempts can be evaluated");
    }
    const score = await this.syncAttemptScoresAndStatus(attempt, examId, false);

    if (score.pendingTextEvaluationCount > 0) {
      throw new ApiError(409, "Text answers are still pending evaluation");
    }

    return {
      attemptId: String(attempt._id),
      ...score,
    };
  }

  async publishAttempt(examId: string, attemptId: string, adminUserId: string) {
    await this.ensureExamOwnership(examId, adminUserId);
    const attempt = await this.getAttemptOrThrow(examId, attemptId);
    if (attempt.status !== "SUBMITTED") {
      throw new ApiError(409, "Only submitted attempts can be published");
    }
    const score = await this.syncAttemptScoresAndStatus(attempt, examId, true);

    if (score.pendingTextEvaluationCount > 0) {
      throw new ApiError(409, "Text answers are still pending evaluation");
    }

    return {
      attemptId: String(attempt._id),
      ...score,
      isResultPublished: true,
    };
  }

  async publishAllReady(examId: string, adminUserId: string) {
    await this.ensureExamOwnership(examId, adminUserId);

    const readyAttempts = await ExamAttemptModel.find({
      examId,
      status: "SUBMITTED",
      resultStatus: "READY",
    });

    if (readyAttempts.length === 0) {
      return {
        publishedCount: 0,
      };
    }

    for (const attempt of readyAttempts) {
      attempt.resultStatus = "PUBLISHED";
      attempt.publishedAt = new Date();
      await attempt.save();
    }

    return {
      publishedCount: readyAttempts.length,
    };
  }
}

export const examEvaluationService = new ExamEvaluationService();
