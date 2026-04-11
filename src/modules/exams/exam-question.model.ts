import { model, Schema } from "mongoose";

const EXAM_QUESTION_TYPES = ["RADIO", "CHECKBOX", "TEXT"] as const;

const examQuestionOptionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const examQuestionSchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: EXAM_QUESTION_TYPES,
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    options: {
      type: [examQuestionOptionSchema],
      default: [],
    },
    order: {
      type: Number,
      required: true,
      min: 1,
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

examQuestionSchema.index({ examId: 1, order: 1 }, { unique: true });
examQuestionSchema.index({ examId: 1, createdAt: -1 });

export const ExamQuestionModel = model("ExamQuestion", examQuestionSchema);
