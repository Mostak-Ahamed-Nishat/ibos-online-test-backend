import crypto from "node:crypto";
import { env } from "../../config/env";
import { isEmailServiceConfigured, sendEmail } from "../../services/email.service";
import { ApiError } from "../../utils/api-error";
import { EmailVerificationTokenModel, PasswordResetTokenModel } from "./models";
import { hashToken } from "./auth.util";

export const ensureEmailServiceConfigured = (): void => {
  if (!isEmailServiceConfigured()) {
    throw new ApiError(500, "Email service is not configured");
  }
};

export const createEmailVerificationToken = async (userId: string): Promise<string> => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await EmailVerificationTokenModel.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
  });

  return rawToken;
};

export const createPasswordResetToken = async (userId: string): Promise<string> => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await PasswordResetTokenModel.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
  });

  return rawToken;
};

export const buildVerificationLink = (rawToken: string): string =>
  `${env.appBaseUrl}/api/auth/verify-email?token=${rawToken}`;

export const buildResetLink = (rawToken: string): string =>
  `${env.appFrontendUrl}/reset-password?token=${rawToken}`;

export const sendVerificationEmail = async (to: string, verificationLink: string): Promise<void> => {
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
};

export const sendResetPasswordEmail = async (to: string, resetLink: string): Promise<void> => {
  await sendEmail({
    to,
    subject: "Reset your password",
    text: `Use this link to reset your password: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset password</h2>
        <p>You requested to reset your password. Use the link below to continue.</p>
        <p>
          <a href="${resetLink}" target="_blank" rel="noreferrer">Reset Password</a>
        </p>
        <p>If this was not you, please ignore this email.</p>
      </div>
    `,
  });
};
