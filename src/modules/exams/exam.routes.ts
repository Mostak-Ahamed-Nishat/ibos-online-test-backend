import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examController } from "./exam.controller";
import {
  addExamQuestionSchema,
  createExamBasicInfoSchema,
  examIdParamSchema,
  listExamQuerySchema,
} from "./exam.validation";

const examRouter = Router();

examRouter.get(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ query: listExamQuerySchema }),
  examController.listExams,
);

examRouter.post(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ body: createExamBasicInfoSchema }),
  examController.createBasicInfo,
);

examRouter.get(
  "/:examId/questions",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examController.listQuestions,
);

examRouter.post(
  "/:examId/questions",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, body: addExamQuestionSchema }),
  examController.addQuestion,
);

export { examRouter };
