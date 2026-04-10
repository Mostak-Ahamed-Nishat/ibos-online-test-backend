import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examCandidateController } from "./exam-candidate.controller";
import {
  candidateExamListQuerySchema,
  examIdParamSchema,
} from "./exam-candidate.validation";

const examCandidateRouter = Router();

examCandidateRouter.get(
  "/",
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ query: candidateExamListQuerySchema }),
  examCandidateController.listCandidateExams,
);

examCandidateRouter.get(
  "/:examId/instructions",
  requireAuth,
  requireRole(["CANDIDATE"]),
  validateRequest({ params: examIdParamSchema }),
  examCandidateController.getCandidateExamInstructions,
);

export { examCandidateRouter };

