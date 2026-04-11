import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { questionBankController } from "./question-bank.controller";
import {
  createQuestionSchema,
  listQuestionQuerySchema,
  questionIdParamSchema,
  updateQuestionSchema,
} from "./question-bank.validation";

const questionBankRouter = Router();

questionBankRouter.get(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ query: listQuestionQuerySchema }),
  questionBankController.list,
);

questionBankRouter.post(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ body: createQuestionSchema }),
  questionBankController.create,
);

questionBankRouter.get(
  "/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: questionIdParamSchema }),
  questionBankController.getById,
);

questionBankRouter.patch(
  "/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: questionIdParamSchema, body: updateQuestionSchema }),
  questionBankController.update,
);

questionBankRouter.delete(
  "/:questionId",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ params: questionIdParamSchema }),
  questionBankController.delete,
);

export { questionBankRouter };
