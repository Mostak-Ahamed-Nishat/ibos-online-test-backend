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
let hasWarnedAboutSandboxHost = false;

const isMailtrapSandboxHost = (host: string): boolean =>
  host.trim().toLowerCase() === "sandbox.smtp.mailtrap.io";

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

  if (isMailtrapSandboxHost(env.smtpHost) && !hasWarnedAboutSandboxHost) {
    console.warn(
      "SMTP host is set to Mailtrap sandbox. This captures emails for testing and does not deliver to real inboxes.",
    );
    hasWarnedAboutSandboxHost = true;
  }

  const info = await smtp.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
    text,
  });

  const rejected = info.rejected.map((address: string | { address: string }) => {
    if (typeof address === "string") {
      return address.trim().toLowerCase();
    }

    return address.address.trim().toLowerCase();
  });

  const normalizedTo = to.trim().toLowerCase();
  const noAcceptedRecipients = info.accepted.length === 0;
  const targetRecipientRejected = rejected.includes(normalizedTo);

  if (noAcceptedRecipients || targetRecipientRejected) {
    throw new ApiError(502, "Email delivery was rejected by the SMTP server");
  }
};

export const isEmailServiceConfigured = (): boolean => hasSmtpConfig;
