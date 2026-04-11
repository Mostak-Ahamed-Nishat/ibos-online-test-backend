import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import type {
  ExamIdParamInput,
  OfflineSyncInput,
  UpdateCurrentQuestionInput,
} from "./exam-runtime.validation";
import { examRuntimeService } from "./exam-runtime.service";

class ExamRuntimeController {
  getCurrentQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.getCurrentQuestion(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Current question fetched successfully",
      data: result,
    });
  });

  updateCurrentQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as UpdateCurrentQuestionInput;
    const result = await examRuntimeService.updateCurrentQuestion(params.examId, req.user.sub, payload);

    res.status(200).json({
      success: true,
      message: "Question state updated successfully",
      data: result,
    });
  });

  getNavigation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.getNavigation(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Question navigation fetched successfully",
      data: result,
    });
  });

  getReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.getReview(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Review summary fetched successfully",
      data: result,
    });
  });

  submitExam = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.submitExam(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam submitted successfully",
      data: result,
    });
  });

  timeoutSubmitExam = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.timeoutSubmitExam(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam auto-submitted on timeout",
      data: result,
    });
  });

  syncOfflineAnswers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as OfflineSyncInput;
    const result = await examRuntimeService.syncOfflineAnswers(params.examId, req.user.sub, payload);

    res.status(200).json({
      success: true,
      message: "Offline answers synced successfully",
      data: result,
    });
  });

  getOfflineSyncState = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examRuntimeService.getOfflineSyncState(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Offline sync state fetched successfully",
      data: result,
    });
  });
}

export const examRuntimeController = new ExamRuntimeController();
