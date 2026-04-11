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

const configuredCorsOrigins = env.corsOrigins.map(normalizeOrigin);
const normalizedFrontendOrigin = normalizeOrigin(env.appFrontendUrl);
const allowedOrigins =
  configuredCorsOrigins.length > 0
    ? new Set([...configuredCorsOrigins, normalizedFrontendOrigin])
    : null;

app.use(helmet());
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!allowedOrigins) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
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
