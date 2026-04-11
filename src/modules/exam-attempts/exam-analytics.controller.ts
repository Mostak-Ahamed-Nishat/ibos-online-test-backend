import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examAnalyticsService } from "./exam-analytics.service";
import type { AnalyticsListQueryInput, ExamIdParamInput } from "./exam-analytics.validation";

class ExamAnalyticsController {
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }
    const params = req.params as unknown as ExamIdParamInput;
    const result = await examAnalyticsService.getSummary(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam analytics summary fetched successfully",
      data: result,
    });
  });

  listCandidateResults = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }
    const params = req.params as unknown as ExamIdParamInput;
    const query = req.query as unknown as AnalyticsListQueryInput;
    const result = await examAnalyticsService.listCandidateResults(query, params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Candidate submission list fetched successfully",
      data: result.items,
      pagination: result.pagination,
    });
  });

  exportCandidateResultsCsv = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }
    const params = req.params as unknown as ExamIdParamInput;
    const csv = await examAnalyticsService.exportCandidateResultsCsv(params.examId, req.user.sub);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"exam-${params.examId}-results.csv\"`,
    );
    res.status(200).send(csv);
  });
}

export const examAnalyticsController = new ExamAnalyticsController();

