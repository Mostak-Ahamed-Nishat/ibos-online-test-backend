import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { asyncHandler } from "../../utils/async-handler";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutAllInput,
  LogoutInput,
  RefreshTokenInput,
  ResetPasswordInput,
  ResendVerificationInput,
  RegisterInput,
  VerifyEmailQueryInput,
} from "./auth.validation";

class AuthController {
  private getRequestMeta(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(env.refreshTokenCookieName, refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(env.refreshTokenCookieName, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/api/auth",
    });
  }

  private getRefreshTokenFromRequest(req: Request): string {
    const cookieToken = req.cookies?.[env.refreshTokenCookieName];
    const bodyToken = (req.body as Partial<RefreshTokenInput>)?.refreshToken;
    const token = cookieToken || bodyToken;
    if (!token) {
      throw new ApiError(400, "Refresh token is required");
    }
    return token;
  }

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
    const result = await authService.login(payload, this.getRequestMeta(req));
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: result.message,
      tokens: {
        accessToken: result.tokens.accessToken,
        tokenType: result.tokens.tokenType,
        expiresIn: result.tokens.expiresIn,
      },
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

  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as ResendVerificationInput;
    const result = await authService.resendVerification(payload);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(
      { refreshToken: this.getRefreshTokenFromRequest(req) },
      this.getRequestMeta(req),
    );
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: result.message,
      tokens: {
        accessToken: result.tokens.accessToken,
        tokenType: result.tokens.tokenType,
        expiresIn: result.tokens.expiresIn,
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.logout(
      { refreshToken: this.getRefreshTokenFromRequest(req) } as LogoutInput,
      this.getRequestMeta(req),
    );
    this.clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.logoutAll(
      { refreshToken: this.getRefreshTokenFromRequest(req) } as LogoutAllInput,
      this.getRequestMeta(req),
    );
    this.clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(payload, this.getRequestMeta(req));

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as ResetPasswordInput;
    const result = await authService.resetPassword(payload, this.getRequestMeta(req));

    res.status(200).json({
      success: true,
      ...result,
    });
  });
}

export const authController = new AuthController();
