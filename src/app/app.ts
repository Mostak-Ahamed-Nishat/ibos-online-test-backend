import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "../config/env";
import { errorMiddleware } from "../middlewares/error.middleware";
import { notFoundMiddleware } from "../middlewares/not-found.middleware";
import { apiLimiter } from "../middlewares/rate-limit.middleware";
import { router } from "../routes";

const app = express();
const normalizeOrigin = (value: string): string => {
  return value.trim().replace(/\/+$/, "").toLowerCase();
};

const configuredCorsOrigins = env.corsOrigins.map(normalizeOrigin).filter(Boolean);
const normalizedFrontendOrigin = normalizeOrigin(env.appFrontendUrl);
const allowedOriginRules = Array.from(new Set([...configuredCorsOrigins, normalizedFrontendOrigin]));

const isOriginAllowed = (origin: string): boolean => {
  if (env.corsAllowAll || allowedOriginRules.includes("*")) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  return allowedOriginRules.some((rule) => {
    if (rule.includes("*")) {
      const ruleUrl = new URL(rule);
      const originUrl = new URL(normalized);

      if (ruleUrl.protocol !== originUrl.protocol) {
        return false;
      }

      const wildcardHost = ruleUrl.hostname.toLowerCase();
      if (!wildcardHost.startsWith("*.")) {
        return false;
      }

      const baseHost = wildcardHost.slice(2);
      return (
        originUrl.hostname.toLowerCase() === baseHost ||
        originUrl.hostname.toLowerCase().endsWith(`.${baseHost}`)
      );
    }

    return normalized === rule;
  });
};

app.use(helmet());
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Not allowed by CORS. Origin "${origin}" is not in CORS_ORIGINS or APP_FRONTEND_URL`,
        ),
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));
app.use(apiLimiter);

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
