import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { candidateExamLimiter } from "../../middlewares/rate-limit.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examRuntimeController } from "./exam-runtime.controller";
import { examIdParamSchema, offlineSyncSchema, updateCurrentQuestionSchema } from "./exam-runtime.validation";

const examRuntimeRouter = Router();

examRuntimeRouter.get(
  "/:examId/questions/current",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.getCurrentQuestion,
);

examRuntimeRouter.patch(
  "/:examId/questions/current",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema, body: updateCurrentQuestionSchema }),
  examRuntimeController.updateCurrentQuestion,
);

examRuntimeRouter.get(
  "/:examId/navigation",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.getNavigation,
);

examRuntimeRouter.get(
  "/:examId/review",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.getReview,
);

examRuntimeRouter.post(
  "/:examId/submit",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.submitExam,
);

examRuntimeRouter.post(
  "/:examId/timeout-submit",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.timeoutSubmitExam,
);

examRuntimeRouter.post(
  "/:examId/offline-sync",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema, body: offlineSyncSchema }),
  examRuntimeController.syncOfflineAnswers,
);

examRuntimeRouter.get(
  "/:examId/offline-sync",
  candidateExamLimiter,
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examRuntimeController.getOfflineSyncState,
);

export { examRuntimeRouter };
