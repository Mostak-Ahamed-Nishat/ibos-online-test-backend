import { model, Schema } from "mongoose";

const ANSWER_STATUSES = ["ANSWERED", "SKIPPED"] as const;

const examAttemptAnswerSchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "ExamQuestion",
      required: true,
      index: true,
    },
    questionOrder: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    status: {
      type: String,
      enum: ANSWER_STATUSES,
      required: true,
    },
    selectedOptionIndexes: {
      type: [Number],
      default: [],
    },
    answerText: {
      type: String,
      default: "",
      trim: true,
    },
    objectiveAwardedMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    isObjectiveCorrect: {
      type: Boolean,
      default: null,
    },
    manualAwardedMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    isManualEvaluated: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

examAttemptAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
examAttemptAnswerSchema.index({ attemptId: 1, questionOrder: 1 });

export const ExamAttemptAnswerModel = model("ExamAttemptAnswer", examAttemptAnswerSchema);
