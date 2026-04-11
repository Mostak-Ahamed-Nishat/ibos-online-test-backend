import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const smtpHost = process.env.SMTP_HOST ?? "";
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const smtpFrom = process.env.SMTP_FROM ?? "";
const recipient = process.argv[2]?.trim() || process.env.TEST_EMAIL_TO?.trim() || "";

const required = [smtpHost, String(smtpPort), smtpUser, smtpPass, smtpFrom, recipient];
if (required.some((item) => !item)) {
  console.error(
    "Missing SMTP config or recipient. Usage: npm run test:email -- your@email.com",
  );
  process.exit(1);
}

if (smtpHost.trim().toLowerCase() === "sandbox.smtp.mailtrap.io") {
  console.warn(
    "Current SMTP host is Mailtrap sandbox. It captures emails for testing and does not send to real inboxes.",
  );
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const run = async (): Promise<void> => {
  await transporter.verify();

  const info = await transporter.sendMail({
    from: smtpFrom,
    to: recipient,
    subject: "iBOS Exam SMTP Test",
    text: "If you can read this, real email sending is working.",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">iBOS Exam SMTP Test</h2>
        <p style="margin: 0;">If you can read this, real email sending is working.</p>
      </div>
    `,
  });

  console.log("SMTP send result:");
  console.log(
    JSON.stringify(
      {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      },
      null,
      2,
    ),
  );
};

void run().catch((error: unknown) => {
  console.error("SMTP test failed:", error);
  process.exit(1);
});
