import { model, Schema } from "mongoose";

const EXAM_STATUSES = ["DRAFT", "PUBLISHED", "EXPIRED"] as const;
const EXAM_QUESTION_TYPES = ["MCQ", "RADIO", "CHECKBOX", "TEXT", "MIXED"] as const;

const examSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    totalCandidates: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },
    totalQuestionSet: {
      type: Number,
      required: true,
      min: 1,
    },
    questionType: {
      type: String,
      enum: EXAM_QUESTION_TYPES,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    attemptLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: EXAM_STATUSES,
      default: "DRAFT",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

examSchema.index({ createdAt: -1 });

export const ExamModel = model("Exam", examSchema);
