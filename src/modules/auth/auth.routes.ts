import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import {
  loginSchema,
  registerSchema,
  verifyEmailQuerySchema,
} from "./auth.validation";

const authRouter = Router();

authRouter.post("/register", validateRequest({ body: registerSchema }), authController.register);
authRouter.post("/login", validateRequest({ body: loginSchema }), authController.login);
authRouter.get(
  "/verify-email",
  validateRequest({ query: verifyEmailQuerySchema }),
  authController.verifyEmail,
);

export { authRouter };
