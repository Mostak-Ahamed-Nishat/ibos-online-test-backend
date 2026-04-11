import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examEvaluationService } from "./exam-evaluation.service";
import type {
  AttemptIdParamInput,
  ExamIdParamInput,
  GradeTextAnswersInput,
  ListAttemptQueryInput,
} from "./exam-evaluation.validation";

class ExamEvaluationController {
  listAttempts = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const query = req.query as unknown as ListAttemptQueryInput;
    const result = await examEvaluationService.listAttempts(query, params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Attempt list fetched successfully",
      data: result.items,
      summary: result.summary,
      pagination: result.pagination,
    });
  });

  getAttemptDetail = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as AttemptIdParamInput;
    const result = await examEvaluationService.getAttemptDetail(
      params.examId,
      params.attemptId,
      req.user.sub,
    );

    res.status(200).json({
      success: true,
      message: "Attempt detail fetched successfully",
      data: result,
    });
  });

  gradeTextAnswers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as AttemptIdParamInput;
    const payload = req.body as GradeTextAnswersInput;
    const result = await examEvaluationService.gradeTextAnswers(
      payload,
      params.examId,
      params.attemptId,
      req.user.sub,
    );

    res.status(200).json({
      success: true,
      message: "Text answer marks updated successfully",
      data: result,
    });
  });

  markEvaluated = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as AttemptIdParamInput;
    const result = await examEvaluationService.markEvaluated(
      params.examId,
      params.attemptId,
      req.user.sub,
    );

    res.status(200).json({
      success: true,
      message: "Attempt marked as evaluated",
      data: result,
    });
  });

  publishAttempt = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as AttemptIdParamInput;
    const result = await examEvaluationService.publishAttempt(
      params.examId,
      params.attemptId,
      req.user.sub,
    );

    res.status(200).json({
      success: true,
      message: "Result published successfully",
      data: result,
    });
  });

  publishAllReady = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examEvaluationService.publishAllReady(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Ready results published successfully",
      data: result,
    });
  });
}

export const examEvaluationController = new ExamEvaluationController();
