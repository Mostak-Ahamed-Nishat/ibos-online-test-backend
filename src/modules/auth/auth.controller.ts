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
  private getRefreshTokenCookieOptions() {
    const isProduction = env.nodeEnv === "production";

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
      path: "/api/auth",
      maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    };
  }

  private getRequestMeta(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(env.refreshTokenCookieName, refreshToken, this.getRefreshTokenCookieOptions());
  }

  private clearRefreshTokenCookie(res: Response): void {
    const options = this.getRefreshTokenCookieOptions();
    res.clearCookie(env.refreshTokenCookieName, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
    });
  }

  private getRefreshTokenFromRequest(req: Request): string | null {
    const cookieToken = req.cookies?.[env.refreshTokenCookieName];
    const bodyToken = (req.body as Partial<RefreshTokenInput>)?.refreshToken;
    const authHeader = req.get("authorization");
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "").trim()
        : null;
    const token = cookieToken || bodyToken || bearerToken;

    if (typeof token !== "string") {
      return null;
    }

    const normalized = token.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private prefersHtml(req: Request): boolean {
    const accepted = req.accepts(["html", "json"]);
    return accepted === "html";
  }

  private renderVerificationStatusPage(options: {
    title: string;
    message: string;
    description: string;
    statusCode: number;
    tone: "success" | "error";
  }): string {
    const accent = options.tone === "success" ? "#15803d" : "#b91c1c";
    const background =
      options.tone === "success"
        ? "linear-gradient(140deg, #dcfce7 0%, #f0fdf4 55%, #ffffff 100%)"
        : "linear-gradient(140deg, #fee2e2 0%, #fef2f2 55%, #ffffff 100%)";
    const badgeText = options.tone === "success" ? "Verified" : "Verification Failed";

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${options.title}</title>
        </head>
        <body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:${background};font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
          <main style="width:100%;max-width:560px;background:#ffffff;border-radius:18px;padding:40px 32px;box-shadow:0 14px 32px rgba(15,23,42,0.14);text-align:center;">
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${accent};font-weight:700;">
              ${badgeText}
            </p>
            <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;">
              ${options.message}
            </h1>
            <p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">
              ${options.description}
            </p>
            <p style="margin:18px 0 0;font-size:12px;color:#64748b;">
              Status code: ${options.statusCode}
            </p>
          </main>
        </body>
      </html>
    `;
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
    try {
      const result = await authService.verifyEmail(query);

      if (this.prefersHtml(req)) {
        res.status(200).type("html").send(
          this.renderVerificationStatusPage({
            title: "iBOS Exam Account Verified",
            message: "Your iBOS Exam account is verified",
            description: "Your account is now active. You can return to the app and log in.",
            statusCode: 200,
            tone: "success",
          }),
        );
        return;
      }

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (!this.prefersHtml(req)) {
        throw error;
      }

      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      const message =
        statusCode === 400
          ? "This verification link is invalid or expired."
          : "Something went wrong while verifying your account.";

      res.status(statusCode).type("html").send(
        this.renderVerificationStatusPage({
          title: "iBOS Exam Verification",
          message,
          description: "Please request a new verification email and try again.",
          statusCode,
          tone: "error",
        }),
      );
    }
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
    const refreshToken = this.getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    const result = await authService.refreshToken(
      { refreshToken },
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
    this.clearRefreshTokenCookie(res);
    const refreshToken = this.getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
      return;
    }

    const result = await authService.logout(
      { refreshToken } as LogoutInput,
      this.getRequestMeta(req),
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    this.clearRefreshTokenCookie(res);
    const refreshToken = this.getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      res.status(200).json({
        success: true,
        message: "Logout successful from all devices",
      });
      return;
    }

    const result = await authService.logoutAll(
      { refreshToken } as LogoutAllInput,
      this.getRequestMeta(req),
    );

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

  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      throw new ApiError(401, "Unauthorized");
    }

    const result = await authService.getCurrentUser(req.user.sub);
    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export const authController = new AuthController();
