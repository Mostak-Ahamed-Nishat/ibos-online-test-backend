import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examController } from "./exam.controller";
import {
  addQuestionFromBankSchema,
  addExamQuestionSchema,
  createExamBasicInfoSchema,
  examIdParamSchema,
  examQuestionIdParamSchema,
  listExamQuerySchema,
  updateExamBasicInfoSchema,
  updateExamQuestionSchema,
  updateExamStatusSchema,
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
  "/:examId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examController.getExamById,
);

examRouter.patch(
  "/:examId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, body: updateExamBasicInfoSchema }),
  examController.updateBasicInfo,
);

examRouter.patch(
  "/:examId/status",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, body: updateExamStatusSchema }),
  examController.updateStatus,
);

examRouter.delete(
  "/:examId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema }),
  examController.deleteExam,
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

examRouter.post(
  "/:examId/questions/from-bank",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examIdParamSchema, body: addQuestionFromBankSchema }),
  examController.addQuestionFromBank,
);

examRouter.get(
  "/:examId/questions/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examQuestionIdParamSchema }),
  examController.getQuestionById,
);

examRouter.patch(
  "/:examId/questions/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examQuestionIdParamSchema, body: updateExamQuestionSchema }),
  examController.updateQuestion,
);

examRouter.delete(
  "/:examId/questions/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: examQuestionIdParamSchema }),
  examController.deleteQuestion,
);

export { examRouter };
