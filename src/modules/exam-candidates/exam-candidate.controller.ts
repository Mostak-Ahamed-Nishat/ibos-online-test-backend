import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examCandidateService } from "./exam-candidate.service";
import type {
  CandidateExamListQueryInput,
  ExamIdParamInput,
} from "./exam-candidate.validation";

class ExamCandidateController {
  listCandidateExams = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const query = req.query as unknown as CandidateExamListQueryInput;
    const result = await examCandidateService.listCandidateExams(query);

    res.status(200).json({
      success: true,
      message: "Candidate exams fetched successfully",
      data: result.items,
      pagination: result.pagination,
    });
  });

  getCandidateExamInstructions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examCandidateService.getCandidateExamInstructions(params.examId);

    res.status(200).json({
      success: true,
      message: "Exam instructions fetched successfully",
      data: result,
    });
  });
}

export const examCandidateController = new ExamCandidateController();
