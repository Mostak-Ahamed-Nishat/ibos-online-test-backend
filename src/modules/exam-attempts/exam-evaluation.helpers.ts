import { ApiError } from "../../utils/api-error";
import { ExamQuestionModel } from "../exams/exam-question.model";
import { ExamModel } from "../exams/exam.model";
import { ExamAttemptAnswerModel } from "./exam-answer.model";
import { ExamAttemptModel } from "./exam-attempt.model";

export async function ensureExamOwnership(examId: string, adminUserId: string) {
  const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId })
    .select({ _id: 1 })
    .lean();
  if (!exam) {
    throw new ApiError(404, "Exam not found");
  }
  return exam;
}

export async function getAttemptOrThrow(examId: string, attemptId: string) {
  const attempt = await ExamAttemptModel.findOne({ _id: attemptId, examId });
  if (!attempt) {
    throw new ApiError(404, "Attempt not found");
  }
  return attempt;
}

export async function calculateAttemptProgress(examId: string, attemptId: string) {
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
    if (!questionType) continue;

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
      continue;
    }

    objectiveScore += answer.objectiveAwardedMarks ?? 0;
  }

  return {
    objectiveScore,
    textScore,
    totalScore: objectiveScore + textScore,
    pendingTextEvaluationCount,
  };
}

export async function syncAttemptScoresAndStatus(
  attempt: any,
  examId: string,
  publishNow = false,
) {
  const progress = await calculateAttemptProgress(examId, String(attempt._id));

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
