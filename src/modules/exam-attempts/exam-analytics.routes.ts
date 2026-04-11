import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examAnalyticsController } from "./exam-analytics.controller";
import { analyticsListQuerySchema, examIdParamSchema } from "./exam-analytics.validation";

const examAnalyticsRouter = Router();

examAnalyticsRouter.get(
  "/:examId/analytics/summary",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examAnalyticsController.getSummary,
);

examAnalyticsRouter.get(
  "/:examId/analytics/candidates",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, query: analyticsListQuerySchema }),
  examAnalyticsController.listCandidateResults,
);

examAnalyticsRouter.get(
  "/:examId/analytics/export.csv",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examAnalyticsController.exportCandidateResultsCsv,
);

export { examAnalyticsRouter };

