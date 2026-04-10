import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examService } from "./exam.service";
import type {
  AddQuestionFromBankInput,
  AddExamQuestionInput,
  CreateExamBasicInfoInput,
  ExamQuestionIdParamInput,
  ExamIdParamInput,
  ListExamQueryInput,
  UpdateExamBasicInfoInput,
  UpdateExamStatusInput,
  UpdateExamQuestionInput,
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

  getExamById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examService.getExamById(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam details fetched successfully",
      data: result,
    });
  });

  updateBasicInfo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as UpdateExamBasicInfoInput;
    const result = await examService.updateExamBasicInfo(payload, params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: result,
    });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as UpdateExamStatusInput;
    const result = await examService.updateExamStatus(payload, params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam status updated successfully",
      data: result,
    });
  });

  deleteExam = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const result = await examService.deleteExam(params.examId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
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

  addQuestionFromBank = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as AddQuestionFromBankInput;
    const result = await examService.addQuestionFromBank(payload, params.examId, req.user.sub);

    res.status(201).json({
      success: true,
      message: "Question added to exam from question bank",
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

  getQuestionById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamQuestionIdParamInput;
    const result = await examService.getQuestionById(params.examId, params.questionId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam question fetched successfully",
      data: result,
    });
  });

  updateQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamQuestionIdParamInput;
    const payload = req.body as UpdateExamQuestionInput;
    const result = await examService.updateQuestion(
      payload,
      params.examId,
      params.questionId,
      req.user.sub,
    );

    res.status(200).json({
      success: true,
      message: "Exam question updated successfully",
      data: result,
    });
  });

  deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamQuestionIdParamInput;
    const result = await examService.deleteQuestion(params.examId, params.questionId, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Exam question deleted successfully",
      data: result,
    });
  });
}

export const examController = new ExamController();
