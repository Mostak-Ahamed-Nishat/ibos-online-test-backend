import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).optional().default(5000),
  MONGODB_URI: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  APP_FRONTEND_URL: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(16),
  ACCESS_TOKEN_EXPIRES_IN: z.string().optional().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(365).optional().default(30),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).optional().default("refreshToken"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default(""),
  CORS_ORIGINS: z.string().optional().default(""),
  CORS_ALLOW_ALL: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value.trim().toLowerCase() === "true"),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).optional().default(60000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(10).optional().default(300),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  const firstIssue = parsedEnv.error.issues[0];
  throw new Error(`Invalid environment configuration: ${firstIssue.path.join(".")} ${firstIssue.message}`);
}

const envData = parsedEnv.data;
const corsOrigins = envData.CORS_ORIGINS
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: envData.NODE_ENV,
  port: envData.PORT,
  mongoUri: envData.MONGODB_URI,
  appBaseUrl: envData.APP_BASE_URL,
  appFrontendUrl: envData.APP_FRONTEND_URL,
  accessTokenSecret: envData.ACCESS_TOKEN_SECRET,
  accessTokenExpiresIn: envData.ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiresInDays: envData.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  refreshTokenCookieName: envData.REFRESH_TOKEN_COOKIE_NAME,
  smtpHost: envData.SMTP_HOST,
  smtpPort: envData.SMTP_PORT,
  smtpUser: envData.SMTP_USER,
  smtpPass: envData.SMTP_PASS,
  smtpFrom: envData.SMTP_FROM,
  corsOrigins,
  corsAllowAll: envData.CORS_ALLOW_ALL,
  apiRateLimitWindowMs: envData.API_RATE_LIMIT_WINDOW_MS,
  apiRateLimitMax: envData.API_RATE_LIMIT_MAX,
};
