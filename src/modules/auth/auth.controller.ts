import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { asyncHandler } from "../../utils/async-handler";
import type {
  LoginInput,
  RegisterInput,
  VerifyEmailQueryInput,
} from "./auth.validation";

class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as RegisterInput;
    const result = await authService.register(payload);

    res.status(201).json({
      success: true,
      ...result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as LoginInput;
    const result = await authService.login(payload);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as VerifyEmailQueryInput;
    const result = await authService.verifyEmail(query);

    res.status(200).json({
      success: true,
      ...result,
    });
  });
}

export const authController = new AuthController();
