import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { candidateExamLimiter } from "../../middlewares/rate-limit.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examResultController } from "./exam-result.controller";
import { candidateResultListQuerySchema, examIdParamSchema } from "./exam-result.validation";

const examResultRouter = Router();

examResultRouter.get(
  "/results",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ query: candidateResultListQuerySchema }),
  examResultController.listResults,
);

examResultRouter.get(
  "/:examId/result",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examResultController.getExamResult,
);

export { examResultRouter };
