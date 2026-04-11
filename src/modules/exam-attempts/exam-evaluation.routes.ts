import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examEvaluationController } from "./exam-evaluation.controller";
import {
  attemptIdParamSchema,
  examIdParamSchema,
  gradeTextAnswersSchema,
  listAttemptQuerySchema,
} from "./exam-evaluation.validation";

const examEvaluationRouter = Router();

examEvaluationRouter.get(
  "/:examId/results/attempts",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, query: listAttemptQuerySchema }),
  examEvaluationController.listAttempts,
);

examEvaluationRouter.get(
  "/:examId/results/attempts/:attemptId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: attemptIdParamSchema }),
  examEvaluationController.getAttemptDetail,
);

examEvaluationRouter.patch(
  "/:examId/results/attempts/:attemptId/text-marks",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: attemptIdParamSchema, body: gradeTextAnswersSchema }),
  examEvaluationController.gradeTextAnswers,
);

examEvaluationRouter.patch(
  "/:examId/results/attempts/:attemptId/evaluated",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: attemptIdParamSchema }),
  examEvaluationController.markEvaluated,
);

examEvaluationRouter.patch(
  "/:examId/results/attempts/:attemptId/publish",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: attemptIdParamSchema }),
  examEvaluationController.publishAttempt,
);

examEvaluationRouter.patch(
  "/:examId/results/publish-all",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examEvaluationController.publishAllReady,
);

export { examEvaluationRouter };

