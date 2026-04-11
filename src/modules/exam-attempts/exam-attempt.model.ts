import { model, Schema } from "mongoose";

const EXAM_ATTEMPT_STATUSES = ["IN_PROGRESS", "SUBMITTED", "TIMEOUT"] as const;
const EXAM_RESULT_STATUSES = ["PENDING_EVALUATION", "READY", "PUBLISHED"] as const;
const SUBMISSION_SOURCES = ["MANUAL", "AUTO_TIMEOUT", "AUTO_VIOLATION"] as const;

const examAttemptSchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attemptNo: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: EXAM_ATTEMPT_STATUSES,
      required: true,
      default: "IN_PROGRESS",
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    currentQuestionOrder: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    objectiveScore: {
      type: Number,
      required: true,
      default: 0,
    },
    textScore: {
      type: Number,
      required: true,
      default: 0,
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
    },
    resultStatus: {
      type: String,
      enum: EXAM_RESULT_STATUSES,
      required: true,
      default: "PENDING_EVALUATION",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    submissionSource: {
      type: String,
      enum: SUBMISSION_SOURCES,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

examAttemptSchema.index({ examId: 1, candidateId: 1, attemptNo: 1 }, { unique: true });
examAttemptSchema.index(
  { examId: 1, candidateId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "IN_PROGRESS" } },
);

export const ExamAttemptModel = model("ExamAttempt", examAttemptSchema);
