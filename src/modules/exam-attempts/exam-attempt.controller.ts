import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import type { ExamIdParamInput } from "./exam-attempt.validation";
import { examAttemptService } from "./exam-attempt.service";

class ExamAttemptController {
  startExam = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examAttemptService.startExam(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.session,
    });
  });

  getCurrentSession = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examAttemptService.getCurrentSession(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.session,
    });
  });
}

export const examAttemptController = new ExamAttemptController();

