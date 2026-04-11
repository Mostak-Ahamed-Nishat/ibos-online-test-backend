import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examService } from "./exam.service";
import type {
  AddExamQuestionInput,
  CreateExamBasicInfoInput,
  ExamIdParamInput,
  ListExamQueryInput,
} from "./exam.validation";

class ExamController {
  listExams = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const query = req.query as unknown as ListExamQueryInput;
    const result = await examService.listExams(query, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam list fetched successfully",
      data: result.items,
      pagination: result.pagination,
    });
  });

  createBasicInfo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const payload = req.body as CreateExamBasicInfoInput;
    const result = await examService.createBasicInfo(payload, req.user.sub);

    res.status(201).json({
      success: true,
      message: "Exam basic information created",
      data: result,
    });
  });

  addQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as AddExamQuestionInput;
    const result = await examService.addQuestion(payload, params.examId, req.user.sub);

    res.status(201).json({
      success: true,
      message: "Question added to exam",
      data: result,
    });
  });

  listQuestions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examService.listQuestions(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam questions fetched successfully",
      data: result,
    });
  });
}

export const examController = new ExamController();
