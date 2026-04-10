import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { isEmailServiceConfigured, sendEmail } from "../../services/email.service";
import { issueAccessToken } from "./auth.token";
import {
  EmailVerificationTokenModel,
  RefreshTokenModel,
  UserModel,
} from "./models";
import type {
  LoginInput,
  LogoutAllInput,
  LogoutInput,
  RefreshTokenInput,
  ResendVerificationInput,
  RegisterInput,
  VerifyEmailQueryInput,
} from "./auth.validation";

export class AuthService {
  private readonly resendCooldownMs = 3 * 60 * 1000;
  private readonly accessTokenExpiresInSeconds = 15 * 60;

  private async generateUniqueStudentId(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      let generated = "";
      for (let i = 0; i < 6; i += 1) {
        generated += chars[Math.floor(Math.random() * chars.length)];
      }

      // Retry on collision; index also protects uniqueness at DB level.
      const exists = await UserModel.exists({ studentId: generated });
      if (!exists) {
        return generated;
      }
    }

    throw new ApiError(500, "Could not generate unique student id");
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await EmailVerificationTokenModel.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
    });

    return rawToken;
  }

  private async sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
    await sendEmail({
      to,
      subject: "Verify your email address",
      text: `Welcome to iBOS Exam. Verify your email: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Verify your email</h2>
          <p>Welcome to iBOS Exam. Please verify your email to activate your account.</p>
          <p>
            <a href="${verificationLink}" target="_blank" rel="noreferrer">Verify Email</a>
          </p>
          <p>If the button does not work, use this link:</p>
          <p>${verificationLink}</p>
        </div>
      `,
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawRefreshToken = crypto.randomBytes(48).toString("hex");
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );

    await RefreshTokenModel.create({
      userId,
      tokenHash: refreshTokenHash,
      expiresAt,
      revokedAt: null,
    });

    return rawRefreshToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async findActiveRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    return RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

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
    if (!isEmailServiceConfigured()) {
      throw new ApiError(500, "Email service is not configured");
    }

    const existingUser = await UserModel.findOne({ email: payload.email }).lean();
    if (existingUser) {
      throw new ApiError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const studentId = await this.generateUniqueStudentId();

    const user = await UserModel.create({
      studentId,
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      role: "CANDIDATE",
      isEmailVerified: false,
    });

    const rawToken = await this.createEmailVerificationToken(String(user._id));

    const verificationLink = `${env.appBaseUrl}/api/auth/verify-email?token=${rawToken}`;
    await this.sendVerificationEmail(user.email, verificationLink);

    return {
      message: "Registration successful. Verification email has been sent.",
      ...(env.nodeEnv !== "production" ? { verificationLink } : {}),
    };
  }

  async login(payload: LoginInput): Promise<{
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
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new ApiError(403, "Your account is suspended");
    }

    const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatched) {
      throw new ApiError(401, "Invalid email or password");
    }

    // Candidate must verify email first; admins can log in without this gate.
    if (user.role === "CANDIDATE" && !user.isEmailVerified) {
      throw new ApiError(403, "Please verify your email before login");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = this.issueTokenPair(user);
    const refreshToken = await this.createRefreshToken(String(user._id));

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
    // Compare hashed version of incoming token with stored hash.
    const tokenHash = crypto.createHash("sha256").update(query.token).digest("hex");
    const now = new Date();

    const tokenDoc = await EmailVerificationTokenModel.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } },
      { new: true },
    );

    if (!tokenDoc) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    // Mark user verified.
    await UserModel.updateOne({ _id: tokenDoc.userId }, { $set: { isEmailVerified: true } });

    // Invalidate any other active verification tokens for this user.
    await EmailVerificationTokenModel.updateMany(
      { userId: tokenDoc.userId, usedAt: null },
      { $set: { usedAt: now } },
    );

    return {
      message: "Email verified successfully. You can now login.",
    };
  }

  async resendVerification(payload: ResendVerificationInput): Promise<{ message: string }> {
    if (!isEmailServiceConfigured()) {
      throw new ApiError(500, "Email service is not configured");
    }

    const genericMessage = "If the email is registered, a verification link has been sent.";
    const user = await UserModel.findOne({ email: payload.email });

    if (!user || user.role !== "CANDIDATE" || user.isEmailVerified) {
      return { message: genericMessage };
    }

    const lastIssuedToken = await EmailVerificationTokenModel.findOne({
      userId: user._id,
    })
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

    const rawToken = await this.createEmailVerificationToken(String(user._id));
    const verificationLink = `${env.appBaseUrl}/api/auth/verify-email?token=${rawToken}`;
    await this.sendVerificationEmail(user.email, verificationLink);

    return { message: genericMessage };
  }

  async refreshToken(payload: RefreshTokenInput): Promise<{
    message: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      tokenType: "Bearer";
      expiresIn: number;
    };
  }> {
    const existingToken = await this.findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await UserModel.findById(existingToken.userId);
    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "User not found or inactive");
    }

    if (user.role === "CANDIDATE" && !user.isEmailVerified) {
      throw new ApiError(403, "Please verify your email before login");
    }

    const { accessToken } = this.issueTokenPair(user);
    const newRefreshToken = await this.createRefreshToken(String(user._id));
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const newTokenDoc = await RefreshTokenModel.findOne({ tokenHash: newRefreshTokenHash });

    existingToken.revokedAt = new Date();
    existingToken.replacedByTokenId = newTokenDoc?._id ?? null;
    await existingToken.save();

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

  async logout(payload: LogoutInput): Promise<{ message: string }> {
    const existingToken = await this.findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      return { message: "Logout successful" };
    }

    existingToken.revokedAt = new Date();
    await existingToken.save();

    return { message: "Logout successful" };
  }

  async logoutAll(payload: LogoutAllInput): Promise<{ message: string }> {
    const existingToken = await this.findActiveRefreshToken(payload.refreshToken);

    if (!existingToken) {
      return { message: "Logout successful from all devices" };
    }

    await RefreshTokenModel.updateMany(
      { userId: existingToken.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return { message: "Logout successful from all devices" };
  }
}

export const authService = new AuthService();
