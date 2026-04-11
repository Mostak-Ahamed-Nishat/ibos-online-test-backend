import { Router } from "express";
import mongoose from "mongoose";
import { authRouter } from "../modules/auth/auth.routes";
import { adminRouter } from "../modules/admin/admin.routes";
import { examRouter } from "../modules/exams/exam.routes";
import { questionBankRouter } from "../modules/questions/question-bank.routes";
import { examCandidateRouter } from "../modules/exam-candidates/exam-candidate.routes";
import { examAttemptRouter } from "../modules/exam-attempts/exam-attempt.routes";
import { examRuntimeRouter } from "../modules/exam-attempts/exam-runtime.routes";
import { examEvaluationRouter } from "../modules/exam-attempts/exam-evaluation.routes";
import { examResultRouter } from "../modules/exam-attempts/exam-result.routes";
import { examIntegrityRouter } from "../modules/exam-attempts/exam-integrity.routes";
import { examAnalyticsRouter } from "../modules/exam-attempts/exam-analytics.routes";

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
router.use("/admin", adminRouter);
router.use("/admin/exams", examRouter);
router.use("/admin/exams", examEvaluationRouter);
router.use("/admin/exams", examAnalyticsRouter);
router.use("/admin/question-bank/questions", questionBankRouter);
router.use("/candidate/exams", examCandidateRouter);
router.use("/candidate/exams", examAttemptRouter);
router.use("/candidate/exams", examRuntimeRouter);
router.use("/candidate/exams", examResultRouter);
router.use("/candidate/exams", examIntegrityRouter);

export { router };
