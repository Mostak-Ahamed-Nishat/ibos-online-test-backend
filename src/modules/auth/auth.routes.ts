import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import {
  loginSchema,
  logoutAllSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailQuerySchema,
} from "./auth.validation";

const authRouter = Router();

authRouter.post("/register", validateRequest({ body: registerSchema }), authController.register);
authRouter.post("/login", validateRequest({ body: loginSchema }), authController.login);
authRouter.post(
  "/refresh-token",
  validateRequest({ body: refreshTokenSchema }),
  authController.refreshToken,
);
authRouter.post("/logout", validateRequest({ body: logoutSchema }), authController.logout);
authRouter.post(
  "/logout-all",
  validateRequest({ body: logoutAllSchema }),
  authController.logoutAll,
);
authRouter.get(
  "/verify-email",
  validateRequest({ query: verifyEmailQuerySchema }),
  authController.verifyEmail,
);
authRouter.post(
  "/resend-verification",
  validateRequest({ body: resendVerificationSchema }),
  authController.resendVerification,
);

export { authRouter };
