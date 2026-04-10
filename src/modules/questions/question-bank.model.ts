import { model, Schema } from "mongoose";

const QUESTION_TYPES = ["RADIO", "CHECKBOX", "TEXT"] as const;

const questionBankOptionSchema = new Schema(
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

const questionBankQuestionSchema = new Schema(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    promptKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
      index: true,
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
      type: [questionBankOptionSchema],
      default: [],
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

questionBankQuestionSchema.index({ createdBy: 1, createdAt: -1 });
questionBankQuestionSchema.index({ createdBy: 1, bankName: 1, createdAt: -1 });
questionBankQuestionSchema.index({ createdBy: 1, type: 1, promptKey: 1 }, { unique: true });

export const QuestionBankQuestionModel = model("QuestionBankQuestion", questionBankQuestionSchema);
