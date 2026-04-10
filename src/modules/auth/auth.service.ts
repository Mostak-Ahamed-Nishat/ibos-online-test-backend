import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";
import { isEmailServiceConfigured, sendEmail } from "../../services/email.service";
import {
  EmailVerificationTokenModel,
  UserModel,
} from "./models";
import type {
  LoginInput,
  ResendVerificationInput,
  RegisterInput,
  VerifyEmailQueryInput,
} from "./auth.validation";

export class AuthService {
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

  async login(payload: LoginInput): Promise<{ message: string }> {
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

    return {
      message: "Login successful",
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

    await EmailVerificationTokenModel.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );

    const rawToken = await this.createEmailVerificationToken(String(user._id));
    const verificationLink = `${env.appBaseUrl}/api/auth/verify-email?token=${rawToken}`;
    await this.sendVerificationEmail(user.email, verificationLink);

    return { message: genericMessage };
  }
}

export const authService = new AuthService();
