import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["MONGODB_URI", "ACCESS_TOKEN_SECRET"] as const;

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI as string,
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5000",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? 30),
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME ?? "refreshToken",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
};
