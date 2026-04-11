import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { asyncHandler } from "../../utils/async-handler";
import { examIntegrityService } from "./exam-integrity.service";
import type { ExamIdParamInput, ReportIntegrityEventInput } from "./exam-integrity.validation";

class ExamIntegrityController {
  reportEvent = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const params = req.params as unknown as ExamIdParamInput;
    const payload = req.body as ReportIntegrityEventInput;
    const result = await examIntegrityService.reportEvent(params.examId, req.user.sub, payload);

    res.status(200).json({
      success: true,
      message: result.autoSubmitted
        ? "Integrity violation limit reached. Exam auto-submitted."
        : "Integrity event captured",
      data: result,
    });
  });
}

export const examIntegrityController = new ExamIntegrityController();

