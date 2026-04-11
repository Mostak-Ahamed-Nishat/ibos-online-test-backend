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
  `${env.appBaseUrl.replace(/\/+$/, "")}/api/auth/verify-email?token=${rawToken}`;

export const buildResetLink = (rawToken: string): string =>
  `${env.appFrontendUrl.replace(/\/+$/, "")}/reset-password?token=${rawToken}`;

export const sendVerificationEmail = async (to: string, verificationLink: string): Promise<void> => {
  await sendEmail({
    to,
    subject: "Activate your iBOS Exam account",
    text: [
      "Welcome to iBOS Exam.",
      "Click the verification link below to activate your account:",
      verificationLink,
    ].join("\n"),
    html: `
      <div style="margin: 0; padding: 24px; background: #f2f6ff; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);">
          <tr>
            <td style="padding: 32px 32px 8px;">
              <p style="margin: 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #2563eb; font-weight: 700;">iBOS Exam</p>
              <h2 style="margin: 12px 0 0; font-size: 28px; line-height: 1.2;">Verify Your Account</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #334155;">
                Welcome to iBOS Exam. Click the button below to activate your account and start your exam journey.
              </p>
              <a
                href="${verificationLink}"
                target="_blank"
                rel="noreferrer"
                style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 26px; border-radius: 12px;"
              >
                Verify iBOS Account
              </a>
            </td>
          </tr>
        </table>
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
