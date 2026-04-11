import { Types } from "mongoose";
import { ApiError } from "../../utils/api-error";
import { UserModel } from "../auth/models/user.model";
import { ExamModel } from "../exams/exam.model";
import { ExamQuestionModel } from "../exams/exam-question.model";
import { ExamAttemptModel } from "./exam-attempt.model";
import type { AnalyticsListQueryInput } from "./exam-analytics.validation";

export class ExamAnalyticsService {
  private async getExamOrThrow(examId: string, adminUserId: string) {
    const exam = await ExamModel.findOne({ _id: examId, createdBy: adminUserId })
      .select({ _id: 1, title: 1, totalCandidates: 1, passThreshold: 1 })
      .lean();
    if (!exam) {
      throw new ApiError(404, "Exam not found");
    }
    return exam;
  }

  private async getPassContext(examId: string, adminUserId: string) {
    const [exam, questions] = await Promise.all([
      this.getExamOrThrow(examId, adminUserId),
      ExamQuestionModel.find({ examId }).select({ marks: 1 }).lean(),
    ]);

    const maxScore = questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
    const passMark = (maxScore * exam.passThreshold) / 100;

    return { exam, maxScore, passMark };
  }

  private toCsv(rows: Array<Record<string, unknown>>): string {
    if (rows.length === 0) {
      return "studentId,fullName,email,attemptNo,status,resultStatus,objectiveScore,textScore,totalScore,passFail,submittedAt,publishedAt\n";
    }

    const headers = Object.keys(rows[0]);
    const escapeCell = (value: unknown) => {
      const str = value === null || value === undefined ? "" : String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, "\"\"")}"`;
      }
      return str;
    };

    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
    ];
    return `${lines.join("\n")}\n`;
  }

  async getSummary(examId: string, adminUserId: string) {
    const { exam, maxScore, passMark } = await this.getPassContext(examId, adminUserId);

    const attempts = await ExamAttemptModel.find({ examId, status: "SUBMITTED" })
      .select({ totalScore: 1, resultStatus: 1 })
      .lean();

    const submittedCount = attempts.length;
    const pendingCount = Math.max(0, (exam.totalCandidates ?? 0) - submittedCount);
    const publishedCount = attempts.filter((a) => a.resultStatus === "PUBLISHED").length;
    const pendingEvaluationCount = attempts.filter((a) => a.resultStatus === "PENDING_EVALUATION").length;
    const readyCount = attempts.filter((a) => a.resultStatus === "READY").length;

    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.totalScore ?? 0), 0);
    const averageScore = submittedCount > 0 ? Number((totalScore / submittedCount).toFixed(2)) : 0;

    const passCount = attempts.filter((attempt) => (attempt.totalScore ?? 0) >= passMark).length;
    const failCount = submittedCount - passCount;

    return {
      examId: String(exam._id),
      examTitle: exam.title,
      totalCandidates: exam.totalCandidates ?? 0,
      submittedCount,
      pendingCount,
      averageScore,
      maxScore,
      passThresholdPercent: exam.passThreshold ?? 40,
      passMark,
      passCount,
      failCount,
      resultStatusBreakdown: {
        pendingEvaluationCount,
        readyCount,
        publishedCount,
      },
    };
  }

  async listCandidateResults(query: AnalyticsListQueryInput, examId: string, adminUserId: string) {
    const { passMark } = await this.getPassContext(examId, adminUserId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const searchValue = query.search.trim();

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
      {
        $match: {
          examId: new Types.ObjectId(examId),
          status: "SUBMITTED",
        },
      },
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
      studentId: item.candidate.studentId,
      fullName: item.candidate.fullName,
      email: item.candidate.email,
      attemptNo: item.attemptNo,
      status: item.status,
      resultStatus: item.resultStatus,
      objectiveScore: item.objectiveScore,
      textScore: item.textScore,
      totalScore: item.totalScore,
      passFail: item.totalScore >= passMark ? "PASS" : "FAIL",
      submittedAt: item.submittedAt,
      publishedAt: item.publishedAt,
    }));

    const total = result?.totalCount?.[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

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

  async exportCandidateResultsCsv(examId: string, adminUserId: string) {
    const { passMark } = await this.getPassContext(examId, adminUserId);

    const attempts = await ExamAttemptModel.find({ examId, status: "SUBMITTED" })
      .sort({ submittedAt: -1, createdAt: -1 })
      .select({
        candidateId: 1,
        attemptNo: 1,
        status: 1,
        resultStatus: 1,
        objectiveScore: 1,
        textScore: 1,
        totalScore: 1,
        submittedAt: 1,
        publishedAt: 1,
      })
      .lean();

    const candidateIds = [...new Set(attempts.map((attempt) => String(attempt.candidateId)))];
    const candidates = await UserModel.find({ _id: { $in: candidateIds } })
      .select({ _id: 1, studentId: 1, fullName: 1, email: 1 })
      .lean();
    const candidateMap = new Map<string, Record<string, any>>(
      candidates.map((candidate) => [String(candidate._id), candidate]),
    );

    const rows = attempts.map((attempt) => {
      const candidate = candidateMap.get(String(attempt.candidateId));
      return {
        studentId: candidate?.studentId ?? "",
        fullName: candidate?.fullName ?? "",
        email: candidate?.email ?? "",
        attemptNo: attempt.attemptNo,
        status: attempt.status,
        resultStatus: attempt.resultStatus,
        objectiveScore: attempt.objectiveScore,
        textScore: attempt.textScore,
        totalScore: attempt.totalScore,
        passFail: (attempt.totalScore ?? 0) >= passMark ? "PASS" : "FAIL",
        submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : "",
        publishedAt: attempt.publishedAt ? new Date(attempt.publishedAt).toISOString() : "",
      };
    });

    return this.toCsv(rows);
  }
}

export const examAnalyticsService = new ExamAnalyticsService();

