import { Router } from "express";
import mongoose from "mongoose";
import { authRouter } from "../modules/auth/auth.routes";

const router = Router();

router.get("/health", (_req, res) => {
  const dbStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStateMap[mongoose.connection.readyState] ?? "unknown",
  });
});

router.use("/auth", authRouter);

export { router };
