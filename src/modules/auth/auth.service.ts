import bcrypt from "bcryptjs";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { issueAccessToken } from "./auth.token";
import {
  EmailVerificationTokenModel,
  PasswordResetTokenModel,
  UserModel,
} from "./models";
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
import {
  buildResetLink,
  buildVerificationLink,
  createEmailVerificationToken,
  createPasswordResetToken,
  ensureEmailServiceConfigured,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "./auth-email.service";
import { auditAuthEvent } from "./auth-audit.service";
import {
  createRefreshToken,
  findActiveRefreshToken,
  revokeAllActiveRefreshTokens,
  revokeSingleRefreshToken,
  rotateRefreshToken,
} from "./auth-session.service";
import { generateUniqueStudentId, hashToken, type RequestMeta } from "./auth.util";

export class AuthService {
  private readonly resendCooldownMs = 3 * 60 * 1000;
  private readonly accessTokenExpiresInSeconds = 15 * 60;

  private issueTokenPair(user: {
    _id: unknown;
    role: "ADMIN" | "CANDIDATE";
    studentId?: string;
    email: string;
  }) {
    const accessToken = issueAccessToken({
      sub: String(user._id),
      role: user.role,
      studentId: user.role === "CANDIDATE" ? user.studentId : undefined,
      email: user.email,
    });

    return { accessToken };
  }

  async register(payload: RegisterInput): Promise<{
    message: string;
    verificationLink?: string;
  }> {
    ensureEmailServiceConfigured();

    const existingUser = await UserModel.findOne({ email: payload.email }).lean();
    if (existingUser) {
      throw new ApiError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const studentId = await generateUniqueStudentId();

    const user = await UserModel.create({
      studentId,
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      role: "CANDIDATE",
      isEmailVerified: false,
    });

    const rawToken = await createEmailVerificationToken(String(user._id));
    const verificationLink = buildVerificationLink(rawToken);
    await sendVerificationEmail(user.email, verificationLink);

    return {
      message: "Registration successful. Verification email has been sent.",
      ...(env.nodeEnv !== "production" ? { verificationLink } : {}),
    };
  }

  async login(
    payload: LoginInput,
    requestMeta?: RequestMeta,
  ): Promise<{
    message: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      tokenType: "Bearer";
      expiresIn: number;
    };
  }> {
    const user = await UserModel.findOne({ email: payload.email });
    if (!user) {
      await auditAuthEvent({
        action: "auth.login.failed",
        metadata: { email: payload.email, reason: "user_not_found" },
        requestMeta,
      });
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      await auditAuthEvent({
        action: "auth.login.failed",
        actorUserId: String(user._id),
        metadata: { reason: "inactive_user" },
        requestMeta,
      });
      throw new ApiError(403, "Your account is suspended");
    }

    const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatched) {
      await auditAuthEvent({
        action: "auth.login.failed",
        actorUserId: String(user._id),
        metadata: { reason: "invalid_password" },
        requestMeta,
      });
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.role === "CANDIDATE" && !user.isEmailVerified) {
      await auditAuthEvent({
        action: "auth.login.failed",
        actorUserId: String(user._id),
        metadata: { reason: "email_not_verified" },
        requestMeta,
      });
      throw new ApiError(403, "Please verify your email before login");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = this.issueTokenPair(user);
    const refreshToken = await createRefreshToken(String(user._id));

    await auditAuthEvent({
      action: "auth.login.success",
      actorUserId: String(user._id),
      requestMeta,
    });

    return {
      message: "Login successful",
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: this.accessTokenExpiresInSeconds,
      },
    };
  }

  async verifyEmail(query: VerifyEmailQueryInput): Promise<{ message: string }> {
    const tokenHashValue = hashToken(query.token);
    const now = new Date();

    const tokenDoc = await EmailVerificationTokenModel.findOneAndUpdate(
      {
        tokenHash: tokenHashValue,
        usedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } },
      { new: true },
    );

    if (!tokenDoc) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    await UserModel.updateOne({ _id: tokenDoc.userId }, { $set: { isEmailVerified: true } });

    await EmailVerificationTokenModel.updateMany(
      { userId: tokenDoc.userId, usedAt: null },
      { $set: { usedAt: now } },
    );

    return { message: "Email verified successfully. You can now login." };
  }

  async resendVerification(payload: ResendVerificationInput): Promise<{ message: string }> {
    ensureEmailServiceConfigured();

    const genericMessage = "If the email is registered, a verification link has been sent.";
    const user = await UserModel.findOne({ email: payload.email });

    if (!user || user.role !== "CANDIDATE" || user.isEmailVerified) {
      return { message: genericMessage };
    }

    const lastIssuedToken = await EmailVerificationTokenModel.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (
      lastIssuedToken?.createdAt &&
      Date.now() - new Date(lastIssuedToken.createdAt).getTime() < this.resendCooldownMs
    ) {
      throw new ApiError(429, "Please wait 3 minutes before requesting again");
    }

    await EmailVerificationTokenModel.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );

    const rawToken = await createEmailVerificationToken(String(user._id));
    await sendVerificationEmail(user.email, buildVerificationLink(rawToken));

    return { message: genericMessage };
  }

  async forgotPassword(
    payload: ForgotPasswordInput,
    requestMeta?: RequestMeta,
  ): Promise<{ message: string }> {
    ensureEmailServiceConfigured();

    const genericMessage = "If the email is registered, a password reset link has been sent.";
    const user = await UserModel.findOne({ email: payload.email });

    if (!user) {
      await auditAuthEvent({
        action: "auth.forgot_password.request",
        metadata: { email: payload.email, userFound: false },
        requestMeta,
      });
      return { message: genericMessage };
    }

    await PasswordResetTokenModel.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );

    const rawToken = await createPasswordResetToken(String(user._id));
    await sendResetPasswordEmail(user.email, buildResetLink(rawToken));

    await auditAuthEvent({
      action: "auth.forgot_password.request",
      actorUserId: String(user._id),
      metadata: { userFound: true },
      requestMeta,
    });

    return { message: genericMessage };
  }

  async resetPassword(
    payload: ResetPasswordInput,
    requestMeta?: RequestMeta,
  ): Promise<{ message: string }> {
    const tokenHashValue = hashToken(payload.token);
    const now = new Date();

    const resetTokenDoc = await PasswordResetTokenModel.findOneAndUpdate(
      {
        tokenHash: tokenHashValue,
        usedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } },
      { new: true },
    );

    if (!resetTokenDoc) {
      await auditAuthEvent({
        action: "auth.reset_password.failed",
        metadata: { reason: "invalid_or_expired_token" },
        requestMeta,
      });
      throw new ApiError(400, "Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await UserModel.updateOne({ _id: resetTokenDoc.userId }, { $set: { passwordHash } });
    await revokeAllActiveRefreshTokens(String(resetTokenDoc.userId), now);

    await auditAuthEvent({
      action: "auth.reset_password.success",
      actorUserId: String(resetTokenDoc.userId),
      requestMeta,
    });

    return { message: "Password reset successful. Please login again." };
  }

  async refreshToken(
    payload: RefreshTokenInput,
    requestMeta?: RequestMeta,
  ): Promise<{
    message: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      tokenType: "Bearer";
      expiresIn: number;
    };
  }> {
    const existingToken = await findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      await auditAuthEvent({
        action: "auth.refresh.failed",
        metadata: { reason: "invalid_or_expired_token" },
        requestMeta,
      });
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await UserModel.findById(existingToken.userId);
    if (!user || user.status !== "ACTIVE") {
      await auditAuthEvent({
        action: "auth.refresh.failed",
        actorUserId: user ? String(user._id) : null,
        metadata: { reason: "user_not_found_or_inactive" },
        requestMeta,
      });
      throw new ApiError(401, "User not found or inactive");
    }

    if (user.role === "CANDIDATE" && !user.isEmailVerified) {
      await auditAuthEvent({
        action: "auth.refresh.failed",
        actorUserId: String(user._id),
        metadata: { reason: "email_not_verified" },
        requestMeta,
      });
      throw new ApiError(403, "Please verify your email before login");
    }

    const { accessToken } = this.issueTokenPair(user);
    const newRefreshToken = await rotateRefreshToken(String(existingToken._id), String(user._id));

    await auditAuthEvent({
      action: "auth.refresh.success",
      actorUserId: String(user._id),
      requestMeta,
    });

    return {
      message: "Token refreshed successfully",
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: "Bearer",
        expiresIn: this.accessTokenExpiresInSeconds,
      },
    };
  }

  async logout(
    payload: LogoutInput,
    requestMeta?: RequestMeta,
  ): Promise<{ message: string }> {
    const existingToken = await findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      return { message: "Logout successful" };
    }

    await revokeSingleRefreshToken(String(existingToken._id));

    await auditAuthEvent({
      action: "auth.logout.success",
      actorUserId: String(existingToken.userId),
      requestMeta,
    });

    return { message: "Logout successful" };
  }

  async logoutAll(
    payload: LogoutAllInput,
    requestMeta?: RequestMeta,
  ): Promise<{ message: string }> {
    const existingToken = await findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      return { message: "Logout successful from all devices" };
    }

    await revokeAllActiveRefreshTokens(String(existingToken.userId), new Date());

    await auditAuthEvent({
      action: "auth.logout_all.success",
      actorUserId: String(existingToken.userId),
      requestMeta,
    });

    return { message: "Logout successful from all devices" };
  }
}

export const authService = new AuthService();
