import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { candidateExamLimiter } from "../../middlewares/rate-limit.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examIntegrityController } from "./exam-integrity.controller";
import { examIdParamSchema, reportIntegrityEventSchema } from "./exam-integrity.validation";

const examIntegrityRouter = Router();

examIntegrityRouter.post(
  "/:examId/integrity-events",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema, body: reportIntegrityEventSchema }),
  examIntegrityController.reportEvent,
);

export { examIntegrityRouter };
