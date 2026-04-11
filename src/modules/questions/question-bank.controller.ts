import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { questionBankService } from "./question-bank.service";
import type {
  CreateQuestionInput,
  ListQuestionQueryInput,
  QuestionIdParamInput,
  UpdateQuestionInput,
} from "./question-bank.validation";

class QuestionBankController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) throw new ApiError(401, "Unauthorized");

    const payload = req.body as CreateQuestionInput;
    const result = await questionBankService.create(payload, req.user.sub);

    res.status(201).json({ success: true, message: "Question created in bank", data: result });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) throw new ApiError(401, "Unauthorized");

    const query = req.query as unknown as ListQuestionQueryInput;
    const result = await questionBankService.list(query, req.user.sub);

    res.status(200).json({
      success: true,
      message: "Question bank list fetched successfully",
      data: result.items,
      pagination: result.pagination,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) throw new ApiError(401, "Unauthorized");

    const params = req.params as unknown as QuestionIdParamInput;
    const result = await questionBankService.getById(params.questionId, req.user.sub);

    res.status(200).json({ success: true, message: "Question fetched successfully", data: result });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) throw new ApiError(401, "Unauthorized");

    const params = req.params as unknown as QuestionIdParamInput;
    const payload = req.body as UpdateQuestionInput;
    const result = await questionBankService.update(payload, params.questionId, req.user.sub);

    res.status(200).json({ success: true, message: "Question updated successfully", data: result });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) throw new ApiError(401, "Unauthorized");

    const params = req.params as unknown as QuestionIdParamInput;
    const result = await questionBankService.delete(params.questionId, req.user.sub);

    res.status(200).json({ success: true, message: "Question deleted successfully", data: result });
  });
}

export const questionBankController = new QuestionBankController();
