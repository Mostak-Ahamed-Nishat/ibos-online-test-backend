import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examService } from "./exam.service";
import type { CreateExamBasicInfoInput } from "./exam.validation";

class ExamController {
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
}

export const examController = new ExamController();
