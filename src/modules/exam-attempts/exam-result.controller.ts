import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examResultService } from "./exam-result.service";
import type {
  CandidateResultListQueryInput,
  ExamIdParamInput,
} from "./exam-result.validation";

class ExamResultController {
  getExamResult = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examResultService.getExamResult(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam result status fetched successfully",
      data: result,
    });
  });

  listResults = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const query = req.query as unknown as CandidateResultListQueryInput;
    const result = await examResultService.listResults(query, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Candidate results fetched successfully",
      data: result.items,
      pagination: result.pagination,
    });
  });
}

export const examResultController = new ExamResultController();

