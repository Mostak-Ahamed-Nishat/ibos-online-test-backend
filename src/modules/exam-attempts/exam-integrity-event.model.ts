import { model, Schema } from "mongoose";

const INTEGRITY_EVENT_TYPES = ["TAB_SWITCH", "FULLSCREEN_EXIT", "COPY_PASTE", "RIGHT_CLICK"] as const;

const examIntegrityEventSchema = new Schema(
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
    eventType: {
      type: String,
      enum: INTEGRITY_EVENT_TYPES,
      required: true,
      index: true,
    },
    violationCountAfter: {
      type: Number,
      required: true,
      min: 1,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

examIntegrityEventSchema.index({ attemptId: 1, createdAt: -1 });

export const ExamIntegrityEventModel = model("ExamIntegrityEvent", examIntegrityEventSchema);

