import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { authLimiter, loginLimiter } from "../../middlewares/rate-limit.middleware";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  verifyEmailQuerySchema,
} from "./auth.validation";

const authRouter = Router();

authRouter.get("/me", requireAuth, authController.me);
authRouter.post("/register", validateRequest({ body: registerSchema }), authController.register);
authRouter.post(
  "/login",
  loginLimiter,
  validateRequest({ body: loginSchema }),
  authController.login,
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword,
);
authRouter.post("/refresh-token", authLimiter, authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.post("/logout-all", authController.logoutAll);
authRouter.get(
  "/verify-email",
  validateRequest({ query: verifyEmailQuerySchema }),
  authController.verifyEmail,
);
authRouter.post(
  "/resend-verification",
  authLimiter,
  validateRequest({ body: resendVerificationSchema }),
  authController.resendVerification,
);

export { authRouter };
