import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { candidateExamLimiter } from "../../middlewares/rate-limit.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examAttemptController } from "./exam-attempt.controller";
import { examIdParamSchema } from "./exam-attempt.validation";

const examAttemptRouter = Router();

examAttemptRouter.post(
  "/:examId/start",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examAttemptController.startExam,
);

examAttemptRouter.get(
  "/:examId/session",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examAttemptController.getCurrentSession,
);

export { examAttemptRouter };
