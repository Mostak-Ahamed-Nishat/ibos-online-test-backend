import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { examController } from "./exam.controller";
import { createExamBasicInfoSchema } from "./exam.validation";

const examRouter = Router();

examRouter.post(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  validateRequest({ body: createExamBasicInfoSchema }),
  examController.createBasicInfo,
);

export { examRouter };
