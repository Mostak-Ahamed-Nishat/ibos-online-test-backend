import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const hasSmtpConfig =
  Boolean(env.smtpHost) &&
  Boolean(env.smtpPort) &&
  Boolean(env.smtpUser) &&
  Boolean(env.smtpPass) &&
  Boolean(env.smtpFrom);

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!hasSmtpConfig) {
    throw new ApiError(500, "SMTP configuration is missing");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<void> => {
  const smtp = getTransporter();

  await smtp.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
    text,
  });
};

export const isEmailServiceConfigured = (): boolean => hasSmtpConfig;
